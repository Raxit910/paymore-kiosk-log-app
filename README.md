# Paymore Kiosk Log Agent

Production JavaScript background agent for Paymore kiosk machines. The process discovers configured Windows log files, archives them daily into `.zip` files, uploads them to the Paymore Internal Upload API, and keeps running silently. It intentionally contains no Windows Service-specific code; a wrapper such as WinSW can host `node src/index.js` or a packaged executable later.

## Architecture

The project uses clean, functional architecture boundaries:

- `config`: JSON and environment configuration loading, defaults, and validation via singletons.
- `core`: shared ports, models, and errors.
- `logs`: wildcard file discovery, daily `.zip` log archival builder, and logging.
- `http`: reusable JSON/Multipart HTTP client with timeout, retry, backoff, and safe logging.
- `upload`: Paymore Internal Upload API client and zip upload retry queue worker.
- `scheduler`: centralized task scheduler for scanning, upload, and housekeeping.
- `health`: in-process health state for future monitoring integration.
- `telemetry`: provider abstraction. The current implementation is a no-op.

## Project Structure

```text
config/config.json              Runtime configuration sample
src/index.js                    Process entry point and signal handling
src/app.js                      Application lifecycle
src/config                      Defaults, schema, index, env overrides
src/logs                        Discovery, archive builder, rolling app logger
src/http                        Reusable HTTP client
src/upload                      Upload API client and zip retry worker
src/scheduler                   Modular task scheduling
src/health                      Health snapshot service
tests/unit                      Unit tests
```

## Configuration

The agent loads `config/config.json` by default. Set `PAYMORE_AGENT_CONFIG` to use a different file. Environment variables override JSON values.

Common overrides:

```text
PAYMORE_AGENT_UPLOAD_ENDPOINT
PAYMORE_AGENT_UPLOAD_API_KEY
PAYMORE_AGENT_UPLOAD_RETRY_INTERVAL_MS
PAYMORE_AGENT_DAILY_RUN_TIME
PAYMORE_AGENT_LOG_LEVEL
PAYMORE_AGENT_LOG_DIR
PAYMORE_AGENT_QUEUE_DIR
```

Malformed or missing configuration is logged and the agent falls back to safe built-in defaults whenever possible.

## Run

```bash
npm install
npm run dev
```

For production:

```bash
npm start
```

## Lint and Test

```bash
npm run format:check
npm run lint
npm test
npm run verify
```

## Packaging

The application is designed to be packaged natively without a build step.

Common deployment options:

- Ship Node.js LTS with the `src` folder and run `node src/index.js`.
- Package `src`, `node_modules`, and `config` with an executable bundler that supports Node ESM applications.
- Host the command with WinSW as a Windows Service. The service wrapper should handle service registration, restart policy, and stdout/stderr capture.

The application itself remains a normal long-running process, which keeps service concerns outside the codebase.

## Change Archive Frequency

Set `scheduler.dailyRunTime` in `config/config.json` or override with:

```text
PAYMORE_AGENT_DAILY_RUN_TIME=02:00
```

The default is `02:00` (2:00 AM) every day.

## Add New Log Sources

Add another item to `logSources`:

```json
{
  "name": "future",
  "enabled": true,
  "patterns": ["C:\\Paymore\\Kiosk\\future\\*.log"],
  "excludePatterns": []
}
```

Wildcard patterns are supported. Most new sources require configuration only.

## Daily Archival

Instead of keeping track of file checkpoints, the agent executes once daily (e.g. at 2 AM) to scan all matching log files. It filters out any log files modified _today_, effectively capturing only completed log files from the previous days. These older files are bundled together into a single highly-compressed `.zip` file inside the `queue.directory`.

## Upload Flow

1. Scheduler runs the `ArchiveBuilder` daily at the configured time.
2. `ArchiveBuilder` discovers files from configured patterns.
3. Only log files modified strictly before midnight today are selected.
4. The files are zipped into a `.zip` archive inside the `queue.directory`.
5. Scheduler runs the `ZipUploadWorker` every 5 minutes (default).
6. Worker reads `.zip` files, posts them via `multipart/form-data` to the Internal Upload API, and deletes them _only_ after a successful upload.
7. Failed uploads remain in the queue directory. They will be retried automatically in the next 5-minute worker cycle.

The upload layer only knows about the Paymore Internal Upload API. Cloud storage concepts (like S3 static tokens and presigned URLs) remain fully abstracted behind that internal Paymore API.

## Health

`HealthService` exposes internal state for future monitoring:

- process status
- startup time and uptime
- last scan time
- last upload time and result
- pending upload batch count
- current app version and environment

No HTTP health endpoint is exposed yet because the agent is intended to run silently, but the service is ready to be integrated with monitoring later.

## Future Extension Points

- Add a real telemetry provider by implementing `telemetry/noop-telemetry-client.js`.
- Add API authentication rotation by extending `upload-api-client.js` configuration.
- Add WinSW or installer assets in a deployment repository without changing application logic.

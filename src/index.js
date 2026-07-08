import process from 'node:process';
import { initConfig } from './config/index.js';
import { initLogger } from './logs/logger-factory.js';
import { startApp, stopApp } from './app.js';
import { errorToLogObject } from './utils/errors.js';

async function main() {
  try {
    const { config, warnings } = await initConfig();
    const logger = await initLogger(config);

    for (const warning of warnings) {
      logger.warn(warning);
    }
  } catch (error) {
    console.error('Failed to initialize Paymore kiosk log agent.', errorToLogObject(error));
    process.exit(1);
  }

  process.on('SIGINT', () => {
    void stopApp('SIGINT').finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void stopApp('SIGTERM').finally(() => process.exit(0));
  });
  process.on('uncaughtException', (error) => {
    void stopApp(`uncaughtException: ${error.message}`).finally(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    void stopApp(`unhandledRejection: ${error.message}`).finally(() => process.exit(1));
  });

  try {
    await startApp();
  } catch (error) {
    console.error('Failed to start Paymore kiosk log agent.', errorToLogObject(error));
    await stopApp('startup failure');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});

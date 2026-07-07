import { errorToLogObject } from '../utils/errors.js';
import { getLogger } from '../logs/logger-factory.js';

const tasks = [];

export function startScheduler(taskDefinitions, signal) {
  const logger = getLogger();

  for (const def of taskDefinitions) {
    const taskState = {
      name: def.name,
      timer: undefined,
      runningPromise: undefined,
      stopped: false
    };

    tasks.push(taskState);

    const scheduleNext = () => {
      if (taskState.stopped || signal.aborted) {
        return;
      }

      let delayMs = def.intervalMs || 0;
      if (def.dailyRunTime) {
        delayMs = calculateMsToNextDailyRun(def.dailyRunTime);
        if (def.maxJitterMs) {
          delayMs += Math.floor(Math.random() * def.maxJitterMs);
        }
      }

      taskState.timer = setTimeout(
        () => runTask(def, taskState, signal, scheduleNext, logger),
        delayMs
      );
    };

    if (def.runOnStart) {
      runTask(def, taskState, signal, scheduleNext, logger);
    } else {
      scheduleNext();
    }
  }

  logger.info('Scheduler started.', { taskCount: tasks.length });
}

export async function stopScheduler() {
  const logger = getLogger();

  for (const taskState of tasks) {
    taskState.stopped = true;
    if (taskState.timer !== undefined) {
      clearTimeout(taskState.timer);
      taskState.timer = undefined;
    }
  }

  await Promise.all(tasks.map((t) => t.runningPromise));
  tasks.length = 0;

  logger.info('Scheduler stopped.');
}

function runTask(def, taskState, signal, scheduleNext, logger) {
  if (taskState.runningPromise !== undefined) {
    logger.warn('Scheduled task is still running; skipping overlapping execution.', {
      task: def.name
    });
    scheduleNext();
    return;
  }

  taskState.runningPromise = def
    .handler(signal)
    .catch((error) => {
      logger.error('Scheduled task failed.', {
        task: def.name,
        error: errorToLogObject(error)
      });
    })
    .finally(() => {
      taskState.runningPromise = undefined;
      scheduleNext();
    });
}

function calculateMsToNextDailyRun(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);

  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

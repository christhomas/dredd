import clone from 'clone';
import { noCallThru } from 'proxyquire';

import Hooks from './Hooks';
import HooksWorkerClient from './HooksWorkerClient';
import logger from './logger';
import reporterOutputLogger from './reporters/reporterOutputLogger';
import resolvePaths from './resolvePaths';

const proxyquire = noCallThru();

function loadHookFile(hookfile: string, hooks: any): void {
  try {
    proxyquire(hookfile, { hooks });
  } catch (error: any) {
    logger.warn(
      `Skipping hook loading. Error reading hook file '${hookfile}'. ` +
        'This probably means one or more of your hook files are invalid.\n' +
        `Message: ${error.message}\n` +
        `Stack: \n${error.stack}\n`,
    );
  }
}

export async function addHooksAsync(runner: any, transactions: any[]): Promise<void> {
  if (!runner.logs) {
    runner.logs = [];
  }
  runner.hooks = new Hooks({ logs: runner.logs, logger: reporterOutputLogger });

  if (!runner.hooks.transactions) {
    runner.hooks.transactions = {};
  }

  Array.from(transactions).forEach((transaction: any) => {
    runner.hooks.transactions[transaction.name] = transaction;
  });

  // No hooks
  if (!runner.configuration.hookfiles || !runner.configuration.hookfiles.length) {
    return;
  }

  // Loading hookfiles from fs
  const hookfiles = resolvePaths(
    runner.configuration.custom.cwd,
    runner.configuration.hookfiles,
  );
  logger.debug('Found Hookfiles:', hookfiles);

  runner.configuration.hookfiles = hookfiles;
  runner.hooks.configuration = clone(runner.configuration);

  // If the language is nodejs or empty
  if (!runner.configuration.language || runner.configuration.language === 'nodejs') {
    hookfiles.forEach((hookfile: string) => loadHookFile(hookfile, runner.hooks));
    return;
  }

  // If other language, start hooks worker client
  return new Promise((resolve, reject) => {
    new HooksWorkerClient(runner).start((err?: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Legacy callback interface for backward compatibility.
 */
export default function addHooks(runner: any, transactions: any[], callback: (err?: any) => void): void {
  addHooksAsync(runner, transactions)
    .then(() => callback())
    .catch((err) => callback(err));
}

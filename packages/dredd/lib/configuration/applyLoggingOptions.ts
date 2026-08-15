import winston from 'winston';

import logger from '../logger.js';
import reporterOutputLogger from '../reporters/reporterOutputLogger.js';

function buildFormat(colorize: boolean, timestamp: boolean): any {
  const formats: any[] = [];
  if (colorize) {
    formats.push(winston.format.colorize());
  }
  if (timestamp) {
    formats.push(
      winston.format.printf(
        ({ level, message }: { level: string; message: string }) => {
          const ts = new Date().toISOString();
          return `${level}: ${ts} - ${message}`;
        },
      ),
    );
  } else {
    formats.push(winston.format.simple());
  }
  return winston.format.combine(...formats);
}

/**
 * Applies logging options from the given configuration.
 * Operates on the validated normalized config.
 */
function applyLoggingOptions(config: any): void {
  const colorize = config.color !== false;

  // Track colorize state on transport for test observability
  logger.consoleTransport.colorize = colorize;
  reporterOutputLogger.consoleTransport.colorize = colorize;
  reporterOutputLogger.consoleTransport.format = buildFormat(colorize, false);

  // TODO https://github.com/apiaryio/dredd/issues/1346
  if (config.loglevel) {
    const loglevel = config.loglevel.toLowerCase();
    if (loglevel === 'silent') {
      logger.consoleTransport.silent = true;
    } else if (loglevel === 'warning') {
      logger.consoleTransport.level = 'warn';
      logger.consoleTransport.timestamp = false;
      logger.consoleTransport.format = buildFormat(colorize, false);
    } else if (loglevel === 'debug') {
      logger.consoleTransport.level = 'debug';
      logger.consoleTransport.timestamp = true;
      logger.consoleTransport.format = buildFormat(colorize, true);
    } else if (['warn', 'error'].includes(loglevel)) {
      logger.consoleTransport.level = loglevel;
      logger.consoleTransport.timestamp = false;
      logger.consoleTransport.format = buildFormat(colorize, false);
    } else {
      logger.consoleTransport.level = 'warn';
      logger.consoleTransport.timestamp = false;
      logger.consoleTransport.format = buildFormat(colorize, false);
      throw new Error(
        `The logging level '${loglevel}' is unsupported, ` +
          'supported are: silent, error, warning, debug',
      );
    }
  } else {
    logger.consoleTransport.level = 'warn';
    logger.consoleTransport.timestamp = false;
    logger.consoleTransport.format = buildFormat(colorize, false);
  }
}

export default applyLoggingOptions;

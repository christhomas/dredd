import winston from 'winston';

import logger from '../logger';
import reporterOutputLogger from '../reporters/reporterOutputLogger';

function buildFormat(colorize, timestamp) {
  const formats = [];
  if (timestamp) {
    formats.push(winston.format.timestamp());
  }
  if (colorize) {
    formats.push(winston.format.colorize());
  }
  formats.push(winston.format.simple());
  return winston.format.combine(...formats);
}

/**
 * Applies logging options from the given configuration.
 * Operates on the validated normalized config.
 */
function applyLoggingOptions(config) {
  const colorize = config.color !== false;

  // Track colorize state on transport for test observability
  logger.consoleTransport.colorize = colorize;
  reporterOutputLogger.consoleTransport.colorize = colorize;

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

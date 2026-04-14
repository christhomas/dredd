import winston from 'winston';

winston.addColors({
  debug: 'cyan',
  warn: 'yellow',
  error: 'red',
});

const consoleTransport = new winston.transports.Console({
  stderrLevels: ['error', 'warn', 'debug'],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
});

// Track state for runtime config and test observability
consoleTransport.colorize = true;
consoleTransport.timestamp = false;

const logger = winston.createLogger({
  transports: [consoleTransport],
  levels: {
    debug: 2,
    warn: 1,
    error: 0,
  },
});

// Expose console transport directly on logger (winston v3's transports
// getter returns a new array each time, so we can't set properties on it)
logger.consoleTransport = consoleTransport;

export default logger;

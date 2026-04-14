import winston from 'winston';

const customLevels = {
  levels: {
    info: 10,
    test: 9,
    pass: 8,
    fail: 7,
    complete: 6,
    actual: 5,
    expected: 4,
    hook: 3,
    request: 2,
    skip: 1,
    error: 0,
  },
  colors: {
    info: 'blue',
    test: 'yellow',
    pass: 'green',
    fail: 'red',
    complete: 'green',
    actual: 'red',
    expected: 'red',
    hook: 'green',
    request: 'green',
    skip: 'yellow',
    error: 'red',
  },
};

winston.addColors(customLevels.colors);

const consoleTransport = new winston.transports.Console({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
});

// Track state for runtime config and test observability
consoleTransport.colorize = true;
consoleTransport.timestamp = false;

const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: [consoleTransport],
});

// Expose console transport directly on logger
logger.consoleTransport = consoleTransport;

export default logger;

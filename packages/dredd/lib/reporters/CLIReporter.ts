import logger from '../logger';
import reporterOutputLogger from './reporterOutputLogger';
import prettifyResponse from '../prettifyResponse';

const CONNECTION_ERRORS: string[] = [
  'ECONNRESET',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'EPIPE',
];

function CLIReporter(this: any, emitter: any, stats: any, inlineErrors: boolean, details: boolean): void {
  this.type = 'cli';
  this.stats = stats;
  this.inlineErrors = inlineErrors;
  this.details = details;
  this.errors = [];

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

function setTitle(title: string): void {
  const width: number = 80;
  reporterOutputLogger.test(
    `${'='.repeat(width)}\n`
    + `  Test:  ${title}\n`
    + `${'='.repeat(width)}`
  );
}

CLIReporter.prototype.configureEmitter = function configureEmitter(emitter: any): void {
  emitter.on('start', (apiDescriptions: any, callback: () => void) => {
    logger.debug('Beginning Dredd testing...');
    callback();
  });

  emitter.on('end', (callback: () => void) => {
    if (!this.inlineErrors) {
      if (this.errors.length) {
        reporterOutputLogger.info('Displaying failed tests...');
      }
      this.errors.forEach((test: any) => {
        setTitle(test.title);

        reporterOutputLogger.fail(`Duration: ${test.duration}ms`);
        reporterOutputLogger.fail(test.message);
        if (test.request)
          reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
        if (test.expected)
          reporterOutputLogger.expected(
            `\n${prettifyResponse(test.expected)}\n`,
          );
        if (test.actual)
          reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
      });
    }

    if (this.stats.tests > 0) {
      reporterOutputLogger.complete(
        `${this.stats.passes} passing, ` +
          `${this.stats.failures} failing, ` +
          `${this.stats.errors} errors, ` +
          `${this.stats.skipped} skipped, ` +
          `${this.stats.tests} total`,
      );
    }

    reporterOutputLogger.complete(`Tests took ${this.stats.duration}ms`);
    callback();
  });

  emitter.on('test pass', (test: any) => {
    setTitle(test.title);
    reporterOutputLogger.pass(`${test.title} Duration: ${test.duration}ms`);
    if (this.details) {
      reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
      reporterOutputLogger.expected(`\n${prettifyResponse(test.expected)}\n`);
      reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
    }
  });

  emitter.on('test skip', (test: any) => {
    reporterOutputLogger.skip(test.title);
  });

  emitter.on('test fail', (test: any) => {
    setTitle(test.title);
    reporterOutputLogger.fail(`${test.title} Duration: ${test.duration}ms`);
    if (this.inlineErrors) {
      reporterOutputLogger.fail(test.message);
      if (test.request) {
        reporterOutputLogger.request(`\n${prettifyResponse(test.request)}\n`);
      }
      if (test.expected) {
        reporterOutputLogger.expected(`\n${prettifyResponse(test.expected)}\n`);
      }
      if (test.actual) {
        reporterOutputLogger.actual(`\n${prettifyResponse(test.actual)}\n\n`);
      }
    } else {
      this.errors.push(test);
    }
  });

  emitter.on('test error', (error: any, test: any) => {
    if (CONNECTION_ERRORS.includes(error.code)) {
      test.message = 'Error connecting to server under test!';
      reporterOutputLogger.error(test.message);
    } else {
      reporterOutputLogger.error(error.stack);
    }

    reporterOutputLogger.error(`${test.title} duration: ${test.duration}ms`);
    if (!this.inlineErrors) {
      this.errors.push(test);
    }
  });
};

export default CLIReporter;

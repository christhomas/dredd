import logger from '../logger.js';

function BaseReporter(this: any, emitter: any, stats: any): void {
  this.type = 'base';
  this.stats = stats;
  this.configureEmitter(emitter);
  logger.debug(`Using '${this.type}' reporter.`);
}

BaseReporter.prototype.configureEmitter = function configureEmitter(
  emitter: any,
): void {
  emitter.on('start', (apiDescriptions: any, callback: () => void) => {
    this.stats.start = new Date();
    callback();
  });

  emitter.on('end', (callback: () => void) => {
    this.stats.end = new Date();
    this.stats.duration = this.stats.end - this.stats.start;
    callback();
  });

  emitter.on('test start', (test: any) => {
    this.stats.tests += 1;
    test.start = new Date();
  });

  emitter.on('test pass', (test: any) => {
    this.stats.passes += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });

  emitter.on('test skip', () => {
    this.stats.skipped += 1;
  });

  emitter.on('test fail', (test: any) => {
    this.stats.failures += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });

  emitter.on('test error', (error: any, test: any) => {
    this.stats.errors += 1;
    test.end = new Date();
    if (typeof test.start === 'string') {
      test.start = new Date(test.start);
    }
    test.duration = test.end - test.start;
  });
};

export default BaseReporter;

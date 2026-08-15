import { assert } from 'chai';

import reporterOutputLogger from '../../build/reporters/reporterOutputLogger.js';

describe('reporterOutputLogger', () => {
  it('is a winston logger instance', () => {
    assert.isObject(reporterOutputLogger);
    assert.isFunction(reporterOutputLogger.log);
  });

  it('has a console transport', () => {
    assert.isObject(reporterOutputLogger.consoleTransport);
  });

  it('has colorize property on console transport', () => {
    assert.property(reporterOutputLogger.consoleTransport, 'colorize');
  });

  it('has level property on console transport', () => {
    assert.property(reporterOutputLogger.consoleTransport, 'level');
  });

  it('defines custom log levels', () => {
    assert.isObject(reporterOutputLogger.levels);
    assert.property(reporterOutputLogger.levels, 'info');
    assert.property(reporterOutputLogger.levels, 'test');
    assert.property(reporterOutputLogger.levels, 'pass');
    assert.property(reporterOutputLogger.levels, 'fail');
    assert.property(reporterOutputLogger.levels, 'complete');
    assert.property(reporterOutputLogger.levels, 'actual');
    assert.property(reporterOutputLogger.levels, 'expected');
    assert.property(reporterOutputLogger.levels, 'hook');
    assert.property(reporterOutputLogger.levels, 'request');
    assert.property(reporterOutputLogger.levels, 'skip');
    assert.property(reporterOutputLogger.levels, 'error');
  });

  it('has level ordering from error (lowest) to info (highest)', () => {
    assert.isAbove(
      reporterOutputLogger.levels.info,
      reporterOutputLogger.levels.error,
    );
    assert.isAbove(
      reporterOutputLogger.levels.pass,
      reporterOutputLogger.levels.fail,
    );
  });

  it('exposes log methods for custom levels', () => {
    assert.isFunction(reporterOutputLogger.test);
    assert.isFunction(reporterOutputLogger.pass);
    assert.isFunction(reporterOutputLogger.fail);
    assert.isFunction(reporterOutputLogger.complete);
    assert.isFunction(reporterOutputLogger.actual);
    assert.isFunction(reporterOutputLogger.expected);
    assert.isFunction(reporterOutputLogger.hook);
    assert.isFunction(reporterOutputLogger.request);
    assert.isFunction(reporterOutputLogger.skip);
    assert.isFunction(reporterOutputLogger.error);
  });
});

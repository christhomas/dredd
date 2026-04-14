import { assert } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';

import { resolveConfig, DEFAULT_CONFIG } from '../../lib/configuration/applyConfiguration';
import logger from '../../lib/logger';

describe('resolveConfig()', () => {
  let loggerWarnStub;
  let loggerErrorStub;

  beforeEach(() => {
    loggerWarnStub = sinon.stub(logger, 'warn');
    loggerErrorStub = sinon.stub(logger, 'error');
  });

  afterEach(() => {
    loggerWarnStub.restore();
    loggerErrorStub.restore();
  });

  it('returns an object with config, warnings, and errors keys', () => {
    const result = resolveConfig({});
    assert.property(result, 'config');
    assert.property(result, 'warnings');
    assert.property(result, 'errors');
  });

  it('merges provided config with defaults', () => {
    const result = resolveConfig({ color: false });
    assert.strictEqual(result.config.color, false);
    assert.strictEqual(result.config.language, 'nodejs');
  });

  it('preserves default values when not overridden', () => {
    const result = resolveConfig({});
    assert.strictEqual(result.config['dry-run'], false);
    assert.strictEqual(result.config.sorted, false);
    assert.strictEqual(result.config.names, false);
    assert.strictEqual(result.config.language, 'nodejs');
  });

  it('provides an EventEmitter as emitter by default', () => {
    const result = resolveConfig({});
    assert.instanceOf(result.config.emitter, EventEmitter);
  });

  it('preserves a custom emitter when provided', () => {
    const emitter = new EventEmitter();
    const result = resolveConfig({ emitter });
    assert.strictEqual(result.config.emitter, emitter);
  });

  describe('with deprecated options', () => {
    it('returns warnings for deprecated -c option', () => {
      const result = resolveConfig({ c: 'true' });
      assert.isAbove(result.warnings.length, 0);
    });

    it('returns warnings for deprecated --data option', () => {
      const result = resolveConfig({
        data: { 'file.api': 'FORMAT: 1A\n# API\n' },
      });
      assert.isAbove(result.warnings.length, 0);
    });
  });

  describe('with unsupported options', () => {
    it('throws when unsupported options are present', () => {
      assert.throws(() => {
        resolveConfig({ timestamp: true });
      }, /Could not configure Dredd/);
    });

    it('throws for --silent option', () => {
      assert.throws(() => {
        resolveConfig({ silent: true });
      }, /Could not configure Dredd/);
    });

    it('throws for --sandbox option', () => {
      assert.throws(() => {
        resolveConfig({ sandbox: true });
      }, /Could not configure Dredd/);
    });
  });

  describe('flattenConfig', () => {
    it('flattens nested options key into root config', () => {
      const result = resolveConfig({
        options: {
          color: false,
          'dry-run': true,
        },
      });
      assert.strictEqual(result.config.color, false);
      assert.strictEqual(result.config['dry-run'], true);
    });

    it('renames root "server" key to "endpoint"', () => {
      const result = resolveConfig({
        server: 'http://localhost:3000',
      });
      assert.strictEqual(result.config.endpoint, 'http://localhost:3000');
    });

    it('nested options take precedence over root options', () => {
      const result = resolveConfig({
        color: false,
        options: {
          color: true,
        },
      });
      assert.strictEqual(result.config.color, true);
    });
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has expected default values', () => {
    assert.strictEqual(DEFAULT_CONFIG['dry-run'], false);
    assert.strictEqual(DEFAULT_CONFIG.color, true);
    assert.strictEqual(DEFAULT_CONFIG.loglevel, 'warn');
    assert.strictEqual(DEFAULT_CONFIG.language, 'nodejs');
    assert.strictEqual(DEFAULT_CONFIG.sorted, false);
    assert.strictEqual(DEFAULT_CONFIG.names, false);
    assert.strictEqual(DEFAULT_CONFIG['inline-errors'], false);
    assert.strictEqual(DEFAULT_CONFIG.details, false);
  });

  it('has empty arrays for list options', () => {
    assert.deepEqual(DEFAULT_CONFIG.path, []);
    assert.deepEqual(DEFAULT_CONFIG.apiDescriptions, []);
    assert.deepEqual(DEFAULT_CONFIG.method, []);
    assert.deepEqual(DEFAULT_CONFIG.only, []);
    assert.deepEqual(DEFAULT_CONFIG.hookfiles, []);
  });

  it('has null values for optional settings', () => {
    assert.isNull(DEFAULT_CONFIG.endpoint);
    assert.isNull(DEFAULT_CONFIG.reporter);
    assert.isNull(DEFAULT_CONFIG.output);
    assert.isNull(DEFAULT_CONFIG.header);
    assert.isNull(DEFAULT_CONFIG.user);
  });
});

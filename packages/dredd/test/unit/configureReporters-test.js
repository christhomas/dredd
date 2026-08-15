// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
import { EventEmitter } from 'events';

import { assert } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

import * as realLoggerStub from '../../build/logger.js';

import BaseReporter from '../../build/reporters/BaseReporter.js';
import XUnitReporter from '../../build/reporters/XUnitReporter.js';
import CLIReporter from '../../build/reporters/CLIReporter.js';
import DotReporter from '../../build/reporters/DotReporter.js';
import NyanReporter from '../../build/reporters/NyanReporter.js';
import HTMLReporter from '../../build/reporters/HTMLReporter.js';
import MarkdownReporter from '../../build/reporters/MarkdownReporter.js';

import { stubbable } from '../stubs.js';

const [loggerStub, loggerStubForwarded] = stubbable(realLoggerStub);

const BaseReporterStub = sinon.spy(BaseReporter);
const XUnitReporterStub = sinon.spy(XUnitReporter);
const CliReporterStub = sinon.spy(CLIReporter);
const DotReporterStub = sinon.spy(DotReporter);
const NyanCatReporterStub = sinon.spy(NyanReporter);
const HtmlReporterStub = sinon.spy(HTMLReporter);
const MarkdownReporterStub = sinon.spy(MarkdownReporter);

const emitterStub = new EventEmitter();

const configureReporters = (
  await esmock('../../build/configureReporters.js', {
    '../../build/logger.js': loggerStubForwarded,
    '../../build/reporters/BaseReporter.js': BaseReporterStub,
    '../../build/reporters/XUnitReporter.js': XUnitReporterStub,
    '../../build/reporters/CLIReporter.js': CliReporterStub,
    '../../build/reporters/DotReporter.js': DotReporterStub,
    '../../build/reporters/NyanReporter.js': NyanCatReporterStub,
    '../../build/reporters/HTMLReporter.js': HtmlReporterStub,
    '../../build/reporters/MarkdownReporter.js': MarkdownReporterStub,
  })
).default;

function resetStubs() {
  emitterStub.removeAllListeners();
  BaseReporterStub.resetHistory();
  CliReporterStub.resetHistory();
  XUnitReporterStub.resetHistory();
  DotReporterStub.resetHistory();
  NyanCatReporterStub.resetHistory();
  HtmlReporterStub.resetHistory();
  MarkdownReporterStub.resetHistory();
}

describe('configureReporters()', () => {
  const configuration = {
    emitter: emitterStub,
    reporter: [],
    output: [],
    'inline-errors': false,
  };

  before(() => (loggerStub.consoleTransport.silent = true));

  after(() => (loggerStub.consoleTransport.silent = false));

  describe('when there are no reporters', () => {
    beforeEach(() => resetStubs());

    it('should only add a CLIReporter', (done) => {
      configureReporters(configuration, {}, null);
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when silent', () => {
      before(() => (configuration.loglevel = 'silent'));

      after(() => (configuration.loglevel = 'silent'));

      beforeEach(() => resetStubs());

      it('should still add reporters', (done) => {
        configureReporters(configuration, {}, null);
        assert.ok(CliReporterStub.called);
        return done();
      });
    });
  });

  describe('when there are only cli-based reporters', () => {
    before(() => (configuration.reporter = ['dot', 'nyan']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, null);
      assert.isOk(DotReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, null);
      assert.notOk(CliReporterStub.called);
      return done();
    });
  });

  describe('when there are only file-based reporters', () => {
    before(() => (configuration.reporter = ['xunit', 'markdown']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a CLIReporter', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greater than or equals the number of reporters', () => {
      before(() => (configuration.output = ['file1', 'file2', 'file3']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          XUnitReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file2',
          ),
        );
        return done();
      });
    });

    describe('when the number of outputs is less than the number of reporters', () => {
      before(() => (configuration.output = ['file1']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          XUnitReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            undefined,
          ),
        );
        return done();
      });
    });
  });

  describe('when there are both cli-based and file-based reporters', () => {
    before(() => (configuration.reporter = ['nyan', 'markdown', 'html']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.isOk(NyanCatReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.notOk(CliReporterStub.called);
      assert.notOk(DotReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greather than or equals the number of file-based reporters', () => {
      before(() => (configuration.output = ['file1', 'file2']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          HtmlReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file2',
          ),
        );
        return done();
      });
    });

    describe('when the number of outputs is less than the number of file-based reporters', () => {
      before(() => (configuration.output = ['file1']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          HtmlReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            undefined,
          ),
        );
        return done();
      });
    });
  });
});

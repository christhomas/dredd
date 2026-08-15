import { EventEmitter } from 'events';
import fs from 'fs';
import { inherits } from 'util';

import htmlencode from 'htmlencode';
import untildify from 'untildify';
import { makeDirectory } from 'make-dir';
import pathmodule from 'path';

import logger from '../logger';
import reporterOutputLogger from './reporterOutputLogger';
import prettifyResponse from '../prettifyResponse';

function XUnitReporter(this: any, emitter: any, stats: any, path: string, details: boolean): void {
  EventEmitter.call(this);

  this.type = 'xunit';
  this.stats = stats;
  this.details = details;
  this.path = this.sanitizedPath(path);

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

XUnitReporter.prototype.updateSuiteStats = function updateSuiteStats(
  path: string,
  stats: any,
  callback: () => void,
): void {
  fs.readFile(path, (err: any, data: any) => {
    if (!err) {
      data = data.toString();
      const position: number = data.toString().indexOf('\n');
      if (position !== -1) {
        const restOfFile: string = data.substr(position + 1);
        const newStats: string = this.toTag(
          'testsuite',
          {
            name: 'Dredd Tests',
            tests: stats.tests,
            failures: stats.failures,
            errors: stats.errors,
            skip: stats.skipped,
            timestamp: new Date().toUTCString(),
            time: stats.duration / 1000,
          },
          false,
        );
        const xmlHeader: string = '<?xml version="1.0" encoding="UTF-8"?>';
        fs.writeFile(
          path,
          `${xmlHeader}\n${newStats}\n${restOfFile}</testsuite>`,
          (error: any) => {
            if (error) {
              reporterOutputLogger.error(error);
            }
            callback();
          },
        );
      } else {
        callback();
      }
    } else {
      reporterOutputLogger.error(err);
      callback();
    }
  });
};

XUnitReporter.prototype.cdata = function cdata(str: string): string {
  return `<![CDATA[${str}]]>`;
};

XUnitReporter.prototype.appendLine = function appendLine(path: string, line: string): void {
  fs.appendFileSync(path, `${line}\n`);
};

XUnitReporter.prototype.toTag = function toTag(
  name: string,
  attrs: Record<string, any> | null,
  close: boolean,
  content?: string,
): string {
  const end: string = close ? '/>' : '>';
  const pairs: string[] = [];
  if (attrs) {
    Object.keys(attrs).forEach((key: string) => pairs.push(`${key}="${attrs[key]}"`));
  }
  let tag: string = `<${name}${pairs.length ? ` ${pairs.join(' ')}` : ''}${end}`;
  if (content) {
    tag += `${content}</${name}${end}`;
  }
  return tag;
};

XUnitReporter.prototype.sanitizedPath = function sanitizedPath(
  path: string = './report.xml',
): string {
  const filePath: string = pathmodule.resolve(untildify(path));
  if (fs.existsSync(filePath)) {
    logger.warn(`File exists at ${filePath}, will be overwritten...`);
    fs.unlinkSync(filePath);
  }
  return filePath;
};

XUnitReporter.prototype.configureEmitter = function configureEmitter(emitter: any): void {
  emitter.on('start', (apiDescriptions: any, callback: () => void) => {
    makeDirectory(pathmodule.dirname(this.path))
      .then(() => {
        this.appendLine(
          this.path,
          this.toTag(
            'testsuite',
            {
              name: 'Dredd Tests',
              tests: this.stats.tests,
              failures: this.stats.failures,
              errors: this.stats.errors,
              skip: this.stats.skipped,
              timestamp: new Date().toUTCString(),
              time: this.stats.duration / 1000,
            },
            false,
          ),
        );
        callback();
      })
      .catch((err: any) => {
        reporterOutputLogger.error(err);
        callback();
      });
  });

  emitter.on('end', (callback: () => void) => {
    this.updateSuiteStats(this.path, this.stats, callback);
  });

  emitter.on('test pass', (test: any) => {
    const attrs: Record<string, any> = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };

    if (this.details) {
      const deets: string = `\
\nRequest:
${prettifyResponse(test.request)}
Expected:
${prettifyResponse(test.expected)}
Actual:
${prettifyResponse(test.actual)}\
`;
      this.appendLine(
        this.path,
        this.toTag(
          'testcase',
          attrs,
          false,
          this.toTag('system-out', null, false, this.cdata(deets)),
        ),
      );
    } else {
      this.appendLine(this.path, this.toTag('testcase', attrs, true));
    }
  });

  emitter.on('test skip', (test: any) => {
    const attrs: Record<string, any> = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };
    this.appendLine(
      this.path,
      this.toTag('testcase', attrs, false, this.toTag('skipped', null, true)),
    );
  });

  emitter.on('test fail', (test: any) => {
    const attrs: Record<string, any> = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };
    const diff: string = `\
Message:
${test.message}
Request:
${prettifyResponse(test.request)}
Expected:
${prettifyResponse(test.expected)}
Actual:
${prettifyResponse(test.actual)}\
`;
    this.appendLine(
      this.path,
      this.toTag(
        'testcase',
        attrs,
        false,
        this.toTag('failure', null, false, this.cdata(diff)),
      ),
    );
  });

  emitter.on('test error', (error: any, test: any) => {
    const attrs: Record<string, any> = {
      name: htmlencode.htmlEncode(test.title),
      time: test.duration / 1000,
    };
    const errorMessage: string = `\nError: \n${error}\nStacktrace: \n${error.stack}`;
    this.appendLine(
      this.path,
      this.toTag(
        'testcase',
        attrs,
        false,
        this.toTag('failure', null, false, this.cdata(errorMessage)),
      ),
    );
  });
};

inherits(XUnitReporter, EventEmitter);

export default XUnitReporter;

import { EventEmitter } from 'events';
import fs from 'fs';
import { inherits } from 'util';

import untildify from 'untildify';
import { makeDirectory } from 'make-dir';
import pathmodule from 'path';

import logger from '../logger.js';
import reporterOutputLogger from './reporterOutputLogger.js';
import prettifyResponse from '../prettifyResponse.js';

function MarkdownReporter(
  this: any,
  emitter: any,
  stats: any,
  path: string,
  details: boolean,
): void {
  EventEmitter.call(this);

  this.type = 'markdown';
  this.stats = stats;
  this.buf = '';
  this.level = 1;
  this.details = details;
  this.path = this.sanitizedPath(path);

  this.configureEmitter(emitter);

  logger.debug(`Using '${this.type}' reporter.`);
}

MarkdownReporter.prototype.sanitizedPath = function sanitizedPath(
  path: string = './report.md',
): string {
  const filePath: string = pathmodule.resolve(untildify(path));
  if (fs.existsSync(filePath)) {
    logger.warn(`File exists at ${filePath}, will be overwritten...`);
  }
  return filePath;
};

MarkdownReporter.prototype.configureEmitter = function configureEmitter(
  emitter: any,
): void {
  const title = (str: string): string =>
    `${Array(this.level).join('#')} ${str}`;

  emitter.on('start', (apiDescriptions: any, callback: () => void) => {
    this.level++;
    this.buf += `${title('Dredd Tests')}\n`;
    callback();
  });

  emitter.on('end', (callback: () => void) => {
    makeDirectory(pathmodule.dirname(this.path))
      .then(() => {
        fs.writeFile(this.path, this.buf, (error: any) => {
          if (error) {
            reporterOutputLogger.error(error);
          }
          callback();
        });
      })
      .catch((err: any) => {
        reporterOutputLogger.error(err);
        callback();
      });
  });

  emitter.on('test start', () => {
    this.level++;
  });

  emitter.on('test pass', (test: any) => {
    this.buf += `${title(`Pass: ${test.title}`)}\n`;

    if (this.details) {
      this.level++;
      this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse(
        test.request,
      )}\n\`\`\`\n\n`;
      this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse(
        test.expected,
      )}\n\`\`\`\n\n`;
      this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse(
        test.actual,
      )}\n\`\`\`\n\n`;
      this.level--;
    }

    this.level--;
  });

  emitter.on('test skip', (test: any) => {
    this.buf += `${title(`Skip: ${test.title}`)}\n`;
    this.level--;
  });

  emitter.on('test fail', (test: any) => {
    this.buf += title(`Fail: ${test.title}\n`);

    this.level++;
    this.buf += `${title('Message')}\n\`\`\`\n${test.message}\n\`\`\`\n\n`;
    this.buf += `${title('Request')}\n\`\`\`\n${prettifyResponse(
      test.request,
    )}\n\`\`\`\n\n`;
    this.buf += `${title('Expected')}\n\`\`\`\n${prettifyResponse(
      test.expected,
    )}\n\`\`\`\n\n`;
    this.buf += `${title('Actual')}\n\`\`\`\n${prettifyResponse(
      test.actual,
    )}\n\`\`\`\n\n`;
    this.level--;

    this.level--;
  });

  emitter.on('test error', (error: any, test: any) => {
    this.buf += title(`Error: ${test.title}\n`);
    this.buf += '\n```\n';
    this.buf += `\nError: \n${error}\nStacktrace: \n${error.stack}\n`;
    this.buf += '```\n\n';
    this.level--;
  });
};

inherits(MarkdownReporter, EventEmitter);

export default MarkdownReporter;

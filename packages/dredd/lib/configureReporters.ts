import BaseReporter from './reporters/BaseReporter.js';
import CLIReporter from './reporters/CLIReporter.js';
import DotReporter from './reporters/DotReporter.js';
import HTMLReporter from './reporters/HTMLReporter.js';
import MarkdownReporter from './reporters/MarkdownReporter.js';
import NyanCatReporter from './reporters/NyanReporter.js';
import XUnitReporter from './reporters/XUnitReporter.js';

import logger from './logger.js';

const fileReporters: string[] = ['xunit', 'html', 'markdown'];

const cliReporters: string[] = ['dot', 'nyan'];

function intersection(a: string[], b: string[]): string[] {
  if (a.length > b.length) {
    [a, b] = Array.from([b, a]) as [string[], string[]];
  }
  return Array.from(a).filter((value: string) => Array.from(b).includes(value));
}

function configureReporters(config: any, stats: any): any {
  addReporter('base', config.emitter, stats);

  const reporters: string[] = config.reporter;
  const outputs: string[] = config.output;

  logger.debug('Configuring reporters:', reporters, outputs);

  function addCli(reportersArr: string[]): any {
    if (reportersArr.length > 0) {
      const usedCliReporters = intersection(reportersArr, cliReporters);
      if (usedCliReporters.length === 0) {
        return new CLIReporter(
          config.emitter,
          stats,
          config['inline-errors'],
          config.details,
        );
      }
      return addReporter(usedCliReporters[0], config.emitter, stats);
    }
    return new CLIReporter(
      config.emitter,
      stats,
      config['inline-errors'],
      config.details,
    );
  }

  function addReporter(
    reporter: string,
    emitter: any,
    statistics: any,
    path?: string,
  ): any {
    switch (reporter) {
      case 'xunit':
        return new XUnitReporter(emitter, statistics, path, config.details);
      case 'dot':
        return new DotReporter(emitter, statistics);
      case 'nyan':
        return new NyanCatReporter(emitter, statistics);
      case 'html':
        return new HTMLReporter(emitter, statistics, path, config.details);
      case 'markdown':
        return new MarkdownReporter(emitter, statistics, path, config.details);
      default: {
        // eslint-disable-next-line no-new
        new BaseReporter(emitter, statistics);
        break;
      }
    }
  }

  addCli(reporters);

  const usedFileReporters = intersection(reporters, fileReporters);

  stats.fileBasedReporters = usedFileReporters.length;

  if (usedFileReporters.length > 0) {
    const usedFileReportersLength = usedFileReporters.length;
    if (usedFileReportersLength > outputs.length) {
      logger.warn(`
There are more reporters requiring output paths than there are output paths
provided. Using default paths for additional file-based reporters.
`);
    }

    return usedFileReporters.map((usedFileReporter: string, index: number) => {
      const path = outputs[index] ? outputs[index] : undefined;
      return addReporter(usedFileReporter, config.emitter, stats, path);
    });
  }
}

export default configureReporters;

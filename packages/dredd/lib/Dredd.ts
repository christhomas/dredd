import parse from '@antimatter-studios/dredd-transactions/parse';
import compile from '@antimatter-studios/dredd-transactions/compile';

import configureReporters from './configureReporters';
import resolveLocations from './resolveLocations';
import { readLocationAsync } from './readLocation';
import resolveModule from './resolveModule';
import logger from './logger';
import TransactionRunner from './TransactionRunner';
import { applyConfiguration } from './configuration';
import annotationToLoggerInfo from './annotationToLoggerInfo';

function prefixError(error: Error, prefix: string): Error {
  error.message = `${prefix}: ${error.message}`;
  return error;
}

async function readLocations(locations: string[], options: any = {}): Promise<any[]> {
  const apiDescriptions: any[] = [];
  for (const location of locations) {
    try {
      const content = await readLocationAsync(location, options);
      apiDescriptions.push({ location, content });
    } catch (error: any) {
      throw prefixError(error, `Unable to load API description document from '${location}'`);
    }
  }
  return apiDescriptions;
}

function parseContentAsync(content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parse(content, (error: any, result: any) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

async function parseAll(apiDescriptions: any[]): Promise<any[]> {
  const results: any[] = [];
  for (const apiDescription of apiDescriptions) {
    try {
      const parseResult = await parseContentAsync(apiDescription.content);
      results.push({ ...parseResult, ...apiDescription });
    } catch (error: any) {
      throw prefixError(error, `Unable to parse API description document '${apiDescription.location}'`);
    }
  }
  return results;
}

function compileTransactions(apiDescriptions: any[]): any[] {
  return apiDescriptions
    .map(({ mediaType, apiElements, location }) => {
      try {
        return compile(mediaType, apiElements, location);
      } catch (error: any) {
        throw prefixError(
          error,
          'Unable to compile HTTP transactions from ' +
            `API description document '${location}': ${error.message}`,
        );
      }
    })
    .map((compileResult: any, i: number) => ({ ...compileResult, ...apiDescriptions[i] }));
}

function toTransactions(apiDescriptions: any[]): any[] {
  return apiDescriptions
    .map((apiDescription) =>
      apiDescription.transactions.map((transaction: any) => ({
        apiDescription: {
          location: apiDescription.location,
          mediaType: apiDescription.mediaType,
        },
        ...transaction,
      })),
    )
    .reduce((flat: any[], arr: any[]) => flat.concat(arr), []);
}

function toLoggerInfos(apiDescriptions: any[]): any[] {
  return apiDescriptions
    .map((apiDescription) =>
      apiDescription.annotations.map((annotation: any) =>
        annotationToLoggerInfo(apiDescription.location, annotation),
      ),
    )
    .reduce((flat: any[], arr: any[]) => flat.concat(arr), []);
}

class Dredd {
  configuration: any;
  stats: {
    tests: number;
    failures: number;
    errors: number;
    passes: number;
    skipped: number;
    start: number;
    end: number;
    duration: number;
  };
  transactionRunner: TransactionRunner;
  logger: typeof logger;

  constructor(config: any) {
    this.configuration = applyConfiguration(config);
    this.stats = {
      tests: 0,
      failures: 0,
      errors: 0,
      passes: 0,
      skipped: 0,
      start: 0,
      end: 0,
      duration: 0,
    };
    this.transactionRunner = new TransactionRunner(this.configuration);
    this.logger = logger;
  }

  async prepareAPIdescriptions(): Promise<any[]> {
    this.logger.debug('Resolving locations of API description documents');
    const locations = resolveLocations(
      this.configuration.custom.cwd,
      this.configuration.path,
    );

    this.logger.debug('Reading API description documents');
    const fileApiDescriptions = await readLocations(locations, {
      http: this.configuration.http,
    });

    const allAPIdescriptions = this.configuration.apiDescriptions.concat(fileApiDescriptions);

    this.logger.debug('Parsing API description documents');
    const parsedDescriptions = await parseAll(allAPIdescriptions);

    this.logger.debug('Compiling HTTP transactions from API description documents');
    return compileTransactions(parsedDescriptions);
  }

  /**
   * Run Dredd. Accepts a callback for backward compatibility.
   */
  run(callback: (error: any, stats?: any) => void): void {
    this._runAsync()
      .then(() => callback(undefined, this.stats))
      .catch((error) => callback(error, this.stats));
  }

  private async _runAsync(): Promise<void> {
    this.logger.debug('Resolving --require');
    if (this.configuration.require) {
      const requirePath = resolveModule(
        this.configuration.custom.cwd,
        this.configuration.require,
      );
      require(requirePath); // eslint-disable-line global-require, import/no-dynamic-require
    }

    this.logger.debug('Configuring reporters');
    configureReporters(this.configuration, this.stats);
    delete (this.stats as any).fileBasedReporters;

    this.logger.debug('Preparing API description documents');
    const apiDescriptions = await this.prepareAPIdescriptions();

    const loggerInfos = toLoggerInfos(apiDescriptions);
    loggerInfos.forEach(({ level, message }: { level: string; message: string }) =>
      this.logger.log(level, message),
    );
    if (loggerInfos.find((info: any) => info.level === 'error')) {
      throw new Error('API description processing error');
    }

    this.logger.debug('Starting the transaction runner');
    this.configuration.apiDescriptions = apiDescriptions;
    this.transactionRunner.config(this.configuration);
    const transactions = toTransactions(apiDescriptions);

    return new Promise((resolve, reject) => {
      this.transactionRunner.run(transactions, (runError: any) => {
        if (runError) return reject(runError);
        resolve();
      });
    });
  }
}

export default Dredd;

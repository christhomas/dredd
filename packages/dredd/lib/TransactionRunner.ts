import { AssertionError } from 'chai';
import gavel from 'gavel';
import os from 'os';
import url from 'url';

import addHooks from './addHooks.js';
import logger from './logger.js';
import reporterOutputLogger from './reporters/reporterOutputLogger.js';
import packageData from '../package.json' with { type: 'json' };
import sortTransactions from './sortTransactions.js';
import performRequest from './performRequest.js';

function headersArrayToObject(arr: any[]): { [key: string]: string } {
  return Array.from(arr).reduce(
    (result: { [key: string]: string }, currentItem: any) => {
      result[currentItem.name] = currentItem.value;
      return result;
    },
    {},
  );
}

function eventCallback(reporterError: Error | null): void {
  if (reporterError) {
    logger.error(reporterError.message);
  }
}

class TransactionRunner {
  configureTransaction: (transaction: any) => any;
  executeTransaction: (transaction: any, hooks: any, callback?: any) => void;
  configuration: any;
  logs: any[];
  hookStash: any;
  error: Error | null;
  hookHandlerError: Error | null;
  hooks: any;
  multiBlueprint: boolean | undefined;
  parsedUrl: any;

  constructor(configuration: any) {
    this.configureTransaction = this._configureTransaction.bind(this);
    this.executeTransaction = this._executeTransaction.bind(this);
    this.configuration = configuration;
    this.logs = [];
    this.hookStash = {};
    this.error = null;
    this.hookHandlerError = null;
  }

  config(config: any): void {
    this.configuration = config;
    this.multiBlueprint = this.configuration.apiDescriptions.length > 1;
  }

  run(transactions: any[], callback: (err?: any) => void): void {
    this._runAsync(transactions)
      .then(() => callback())
      .catch(callback);
  }

  private async _runAsync(transactions: any[]): Promise<void> {
    logger.debug('Starting reporters and waiting until all of them are ready');
    await new Promise<void>((resolve, reject) => {
      this.emitStart((emitStartErr?: any) => {
        if (emitStartErr) return reject(emitStartErr);
        resolve();
      });
    });

    logger.debug('Sorting HTTP transactions');
    transactions = this.configuration.sorted
      ? sortTransactions(transactions)
      : transactions;

    logger.debug('Configuring HTTP transactions');
    transactions = transactions.map(this.configureTransaction.bind(this));

    logger.debug('Reading hook files and registering hooks');
    await new Promise<void>((resolve, reject) => {
      addHooks(this, transactions, (addHooksError: any) => {
        if (addHooksError) return reject(addHooksError);
        resolve();
      });
    });

    logger.debug('Executing HTTP transactions');
    await new Promise<void>((resolve, reject) => {
      this.executeAllTransactions(
        transactions,
        this.hooks,
        (execAllTransErr: any) => {
          if (execAllTransErr) return reject(execAllTransErr);
          resolve();
        },
      );
    });

    logger.debug(
      'Wrapping up testing and waiting until all reporters are done',
    );
    await new Promise<void>((resolve) => {
      this.emitEnd(() => resolve());
    });
  }

  emitStart(callback: (err?: any) => void): void {
    // More than one reporter is supported
    let reporterCount = this.configuration.emitter.listeners('start').length;

    // When event 'start' is emitted, function in callback is executed for each
    // reporter registered by listeners
    this.configuration.emitter.emit(
      'start',
      this.configuration.apiDescriptions,
      (reporterError: Error | null) => {
        if (reporterError) {
          logger.error(reporterError.message);
        }

        // Last called reporter callback function starts the runner
        reporterCount--;
        if (reporterCount === 0) {
          callback();
        }
      },
    );
  }

  executeAllTransactions(
    transactions: any[],
    hooks: any,
    callback: (err?: any) => void,
  ): void {
    this._executeAllTransactionsAsync(transactions, hooks)
      .then(() => callback())
      .catch(callback);
  }

  private async _executeAllTransactionsAsync(
    transactions: any[],
    hooks: any,
  ): Promise<void> {
    // Warning: Following lines is "differently" performed by 'addHooks'
    // in TransactionRunner.run call. Because addHooks creates hooks.transactions
    // as an object `{}` with transaction.name keys and value is every
    // transaction, we do not fill transactions from executeAllTransactions here.
    // Transactions is supposed to be an Array here!
    let transaction: any;
    if (!hooks.transactions) {
      hooks.transactions = {};
      for (transaction of transactions) {
        hooks.transactions[transaction.name] = transaction;
      }
    }
    // End of warning

    if (this.hookHandlerError) {
      throw this.hookHandlerError;
    }

    logger.debug("Running 'beforeAll' hooks");

    await new Promise<void>((resolve) => {
      this.runHooksForData(hooks.beforeAllHooks, transactions, () => resolve());
    });

    if (this.hookHandlerError) {
      throw this.hookHandlerError;
    }

    // Iterate over transactions' transaction
    for (
      let transactionIndex = 0;
      transactionIndex < transactions.length;
      transactionIndex++
    ) {
      transaction = transactions[transactionIndex];
      logger.debug(
        `Processing transaction #${transactionIndex + 1}:`,
        transaction.name,
      );

      logger.debug("Running 'beforeEach' hooks");
      await new Promise<void>((resolve) => {
        this.runHooksForData(hooks.beforeEachHooks, transaction, () =>
          resolve(),
        );
      });

      if (this.hookHandlerError) {
        throw this.hookHandlerError;
      }

      logger.debug("Running 'before' hooks");
      await new Promise<void>((resolve) => {
        this.runHooksForData(
          hooks.beforeHooks[transaction.name],
          transaction,
          () => resolve(),
        );
      });

      if (this.hookHandlerError) {
        throw this.hookHandlerError;
      }

      // This method:
      // - skips and fails based on hooks or options
      // - executes a request
      // - recieves a response
      // - runs beforeEachValidation hooks
      // - runs beforeValidation hooks
      // - runs Gavel validation
      await new Promise<void>((resolve, reject) => {
        this.executeTransaction(transaction, hooks, (...args: any[]) => {
          if (args[0]) return reject(args[0]);
          resolve();
        });
      });

      if (this.hookHandlerError) {
        throw this.hookHandlerError;
      }

      logger.debug("Running 'afterEach' hooks");
      await new Promise<void>((resolve) => {
        this.runHooksForData(hooks.afterEachHooks, transaction, () =>
          resolve(),
        );
      });

      if (this.hookHandlerError) {
        throw this.hookHandlerError;
      }

      logger.debug("Running 'after' hooks");
      await new Promise<void>((resolve) => {
        this.runHooksForData(
          hooks.afterHooks[transaction.name],
          transaction,
          () => resolve(),
        );
      });

      if (this.hookHandlerError) {
        throw this.hookHandlerError;
      }

      logger.debug(
        `Evaluating results of transaction execution #${transactionIndex + 1}:`,
        transaction.name,
      );
      await new Promise<void>((resolve) => {
        this.emitResult(transaction, () => resolve());
      });
    }

    logger.debug("Running 'afterAll' hooks");
    await new Promise<void>((resolve) => {
      this.runHooksForData(hooks.afterAllHooks, transactions, () => resolve());
    });

    if (this.hookHandlerError) {
      throw this.hookHandlerError;
    }
  }

  // The 'data' argument can be 'transactions' array or 'transaction' object
  runHooksForData(
    hooks: any[] | undefined,
    data: any,
    callback: (err?: any) => void,
  ): void {
    if (hooks && hooks.length) {
      logger.debug('Running hooks...');

      this._runHooksForDataAsync(hooks, data)
        .then(() => callback())
        .catch(callback);
    } else {
      callback();
    }
  }

  private async _runHooksForDataAsync(hooks: any[], data: any): Promise<void> {
    for (let i = 0; i < hooks.length; i++) {
      await new Promise<void>((resolve) => {
        const hookFn = hooks[i];
        try {
          this.runHook(hookFn, data, (err?: any) => {
            if (err) {
              logger.debug('Hook errored:', err);
              this.emitHookError(err, data);
            }
            resolve();
          });
        } catch (error: any) {
          // Beware! This is very problematic part of code. This try/catch block
          // catches also errors thrown in 'runHookCallback', i.e. in all
          // subsequent flow! Then also 'callback' is called twice and
          // all the flow can be executed twice. We need to reimplement this.
          if (error instanceof AssertionError) {
            const transactions = Array.isArray(data) ? data : [data];
            for (const transaction of transactions) {
              this.failTransaction(
                transaction,
                `Failed assertion in hooks: ${error.message}`,
              );
            }
          } else {
            logger.debug('Hook errored:', error);
            this.emitHookError(error, data);
          }

          resolve();
        }
      });
    }
  }

  // The 'data' argument can be 'transactions' array or 'transaction' object.
  //
  // If it's 'transactions', it is treated as single 'transaction' anyway in this
  // function. That probably isn't correct and should be fixed eventually
  // (beware, tests count with the current behavior).
  emitHookError(error: any, data: any): void {
    if (!(error instanceof Error)) {
      error = new Error(error);
    }
    const test = this.createTest(data);
    test.request = data.request;
    this.emitError(error, test);
  }

  runHook(
    hook: (...args: any[]) => void,
    data: any,
    callback: (err?: any) => void,
  ): void {
    if (hook.length === 1) {
      // Sync api
      hook(data);
      callback();
    } else if (hook.length === 2) {
      // Async api
      hook(data, () => callback());
    }
  }

  _configureTransaction(transaction: any): any {
    const { configuration } = this;
    const { origin, request, response } = transaction;

    // Parse the server URL (just once, caching it in @parsedUrl)
    if (!this.parsedUrl) {
      this.parsedUrl = this.parseServerUrl(configuration.endpoint);
    }
    const fullPath = this.getFullPath(this.parsedUrl.path, request.uri);

    const headers = headersArrayToObject(request.headers);

    // Add Dredd User-Agent (if no User-Agent is already present)
    const hasUserAgent = Object.keys(headers)
      .map((name: string) => name.toLowerCase())
      .includes('user-agent');
    if (!hasUserAgent) {
      const system = `${os.type()} ${os.release()}; ${os.arch()}`;
      headers['User-Agent'] = `Dredd/${packageData.version} (${system})`;
    }

    // Parse and add headers from the config to the transaction
    if (configuration.header.length > 0) {
      for (const header of configuration.header) {
        const splitIndex = header.indexOf(':');
        const headerKey = header.substring(0, splitIndex);
        const headerValue = header.substring(splitIndex + 1);
        headers[headerKey] = headerValue;
      }
    }
    request.headers = headers;

    // The data models as used here must conform to Gavel.js
    const expected: any = { headers: headersArrayToObject(response.headers) };
    if (response.body) {
      expected.body = response.body;
    }
    if (response.status) {
      expected.statusCode = response.status;
    }
    if (response.schema) {
      expected.bodySchema = response.schema;
    }

    // Backward compatible transaction name hack. Transaction names will be
    // replaced by Canonical Transaction Paths: https://github.com/apiaryio/dredd/issues/227
    if (!this.multiBlueprint) {
      transaction.name = transaction.name.replace(
        `${transaction.origin.apiName} > `,
        '',
      );
    }

    // Transaction skipping (can be modified in hooks). If the input format
    // is OpenAPI 2, non-2xx transactions should be skipped by default.
    let skip = false;
    if (
      transaction.apiDescription &&
      transaction.apiDescription.mediaType.includes('swagger')
    ) {
      const status = parseInt(response.status, 10);
      if (status < 200 || status >= 300) {
        skip = true;
      }
    }
    delete transaction.apiDescription;

    const configuredTransaction: any = {
      name: transaction.name,
      id: `${request.method} (${expected.statusCode}) ${request.uri}`,
      host: this.parsedUrl.hostname,
      port: this.parsedUrl.port,
      request,
      expected,
      origin,
      fullPath,
      protocol: this.parsedUrl.protocol,
      skip,
    };

    return configuredTransaction;
  }

  parseServerUrl(serverUrl: string): any {
    if (!serverUrl.match(/^https?:\/\//i)) {
      // Protocol is missing. Remove any : or / at the beginning of the URL
      // and prepend the URL with 'http://' (assumed as default fallback).
      serverUrl = `http://${serverUrl.replace(/^[:/]*/, '')}`;
    }
    return url.parse(serverUrl);
  }

  getFullPath(serverPath: string, requestPath: string): string {
    if (serverPath === '/') {
      return requestPath;
    }
    if (!requestPath) {
      return serverPath;
    }

    // Join two paths
    //
    // How:
    // Removes all slashes from the beginning and from the end of each segment.
    // Then joins them together with a single slash. Then prepends the whole
    // string with a single slash.
    //
    // Why:
    // Note that 'path.join' won't work on Windows and 'url.resolve' can have
    // undesirable behavior depending on slashes.
    // See also https://github.com/joyent/node/issues/2216
    let segments: string[] = [serverPath, requestPath];
    segments = Array.from(segments).map((segment: string) =>
      segment.replace(/^\/|\/$/g, ''),
    );
    // Keep trailing slash at the end if specified in requestPath
    // and if requestPath isn't only '/'
    const trailingSlash =
      requestPath !== '/' && requestPath.slice(-1) === '/' ? '/' : '';
    return `/${segments.join('/')}${trailingSlash}`;
  }

  // Factory for 'transaction.test' object creation
  createTest(transaction: any): any {
    return {
      status: '',
      title: transaction.id,
      message: transaction.name,
      origin: transaction.origin,
      startedAt: transaction.startedAt,
      errors: transaction.errors,
    };
  }

  // Purposely side-effectish method to ensure "transaction.test"
  // inherits data from the "transaction".
  // Necessary when a test is skipped/failed to contain
  // transaction information that is otherwise missing.
  ensureTestStructure(transaction: any): void {
    transaction.test.request = transaction.request;
    transaction.test.expected = transaction.expected;
    transaction.test.actual = transaction.real;
    transaction.test.errors = transaction.errors;
    transaction.test.results = transaction.results;
  }

  // Marks the transaction as failed and makes sure everything in the transaction
  // object is set accordingly. Typically this would be invoked when transaction
  // runner decides to force a transaction to behave as failed.
  failTransaction(transaction: any, reason?: string): void {
    transaction.fail = true;

    this.ensureTransactionErrors(transaction);
    if (reason) {
      transaction.errors.push({ severity: 'error', message: reason });
    }

    if (!transaction.test) {
      transaction.test = this.createTest(transaction);
    }
    transaction.test.status = 'fail';
    if (reason) {
      transaction.test.message = reason;
    }

    this.ensureTestStructure(transaction);
  }

  // Marks the transaction as skipped and makes sure everything in the transaction
  // object is set accordingly.
  skipTransaction(transaction: any, reason?: string): void {
    transaction.skip = true;

    this.ensureTransactionErrors(transaction);
    if (reason) {
      transaction.errors.push({ severity: 'warning', message: reason });
    }

    if (!transaction.test) {
      transaction.test = this.createTest(transaction);
    }
    transaction.test.status = 'skip';
    if (reason) {
      transaction.test.message = reason;
    }

    this.ensureTestStructure(transaction);
  }

  // Ensures that given transaction object has the "errors" key
  // where custom test run errors (not validation errors) are stored.
  ensureTransactionErrors(transaction: any): any[] {
    if (!transaction.results) {
      transaction.results = {};
    }
    if (!transaction.errors) {
      transaction.errors = [];
    }

    return transaction.errors;
  }

  // Inspects given transaction and emits 'test *' events with 'transaction.test'
  // according to the test's status
  emitResult(transaction: any, callback: () => void): void {
    if (this.error || !transaction.test) {
      logger.debug(
        'No emission of test data to reporters',
        this.error,
        transaction.test,
      );
      this.error = null; // Reset the error indicator
      return callback();
    }

    if (transaction.skip) {
      if (!(transaction.test && transaction.test.filteredOut)) {
        // Suppress skip emission if filtered by --only
        logger.debug('Emitting to reporters: test skip');
        this.configuration.emitter.emit(
          'test skip',
          transaction.test,
          eventCallback,
        );
      }
      return callback();
    }

    if (transaction.test.valid) {
      if (transaction.fail) {
        this.failTransaction(
          transaction,
          `Failed in after hook: ${transaction.fail}`,
        );
        logger.debug('Emitting to reporters: test fail');
        this.configuration.emitter.emit(
          'test fail',
          transaction.test,
          eventCallback,
        );
      } else {
        logger.debug('Emitting to reporters: test pass');
        this.configuration.emitter.emit(
          'test pass',
          transaction.test,
          eventCallback,
        );
      }
      return callback();
    }

    logger.debug('Emitting to reporters: test fail');
    this.configuration.emitter.emit(
      'test fail',
      transaction.test,
      eventCallback,
    );
    callback();
  }

  // Emits 'test error' with given test data. Halts the transaction runner.
  emitError(error: Error, test: any): void {
    logger.debug('Emitting to reporters: test error');
    this.configuration.emitter.emit('test error', error, test, eventCallback);

    // Record the error to halt the transaction runner. Do not overwrite
    // the first recorded error if more of them occured.
    this.error = this.error || error;
  }

  // This is actually doing more some pre-flight and conditional skipping of
  // the transcation based on the configuration or hooks. TODO rename
  _executeTransaction(
    transaction: any,
    hooks: any,
    callback?: (...args: any[]) => void,
  ): void {
    if (!callback) {
      callback = hooks;
      hooks = undefined;
    }

    // Number in miliseconds (UNIX-like timestamp * 1000 precision)
    transaction.startedAt = Date.now();

    const test = this.createTest(transaction);
    logger.debug('Emitting to reporters: test start');
    this.configuration.emitter.emit('test start', test, eventCallback);

    this.ensureTransactionErrors(transaction);

    if (transaction.skip) {
      logger.debug(
        'HTTP transaction was marked in hooks as to be skipped. Skipping',
      );
      transaction.test = test;
      this.skipTransaction(transaction, 'Skipped in before hook');
      return callback();
    }

    if (transaction.fail) {
      logger.debug(
        'HTTP transaction was marked in hooks as to be failed. Reporting as failed',
      );
      transaction.test = test;
      this.failTransaction(
        transaction,
        `Failed in before hook: ${transaction.fail}`,
      );
      return callback();
    }

    if (this.configuration.names) {
      reporterOutputLogger.info(transaction.name);
      return callback();
    }

    if (this.configuration['dry-run']) {
      reporterOutputLogger.info(`Dry Run: ${transaction.name}`);
      transaction.test = test;
      this.skipTransaction(transaction);

      return callback();
    }

    if (
      this.configuration.method.length > 0 &&
      !Array.from(this.configuration.method).includes(
        transaction.request.method,
      )
    ) {
      logger.debug(`\
Only ${Array.from(this.configuration.method)
        .map((m: any) => m.toUpperCase())
        .join(', ')}\
requests are set to be executed. \
Not performing HTTP ${transaction.request.method.toUpperCase()} request.\
`);
      transaction.test = test;
      this.skipTransaction(transaction);
      return callback();
    }

    if (
      this.configuration.only.length > 0 &&
      !Array.from(this.configuration.only).includes(transaction.name)
    ) {
      logger.debug(`\
Only '${this.configuration.only}' transaction is set to be executed. \
Not performing HTTP request for '${transaction.name}'.\
`);
      transaction.test = test;
      transaction.test.filteredOut = true;
      this.skipTransaction(transaction);
      return callback();
    }

    this.performRequestAndValidate(test, transaction, hooks, callback);
  }

  // An actual HTTP request, before validation hooks triggering
  // and the response validation is invoked here
  performRequestAndValidate(
    test: any,
    transaction: any,
    hooks: any,
    callback: (...args: any[]) => void,
  ): void {
    this._performRequestAndValidateAsync(test, transaction, hooks)
      .then(() => callback())
      .catch(callback);
  }

  private async _performRequestAndValidateAsync(
    test: any,
    transaction: any,
    hooks: any,
  ): Promise<void> {
    const uri =
      url.format({
        protocol: transaction.protocol,
        hostname: transaction.host,
        port: transaction.port,
      }) + transaction.fullPath;
    const options = { http: this.configuration.http };

    const real = await new Promise<any>((resolve, reject) => {
      performRequest(
        uri,
        transaction.request,
        options,
        (error: any, real: any) => {
          if (error) {
            logger.debug('Requesting tested server errored:', error);
            test.title = transaction.id;
            test.expected = transaction.expected;
            test.request = transaction.request;
            this.emitError(error, test);
            // Resolve with null to match original behavior: callback() was called without error
            resolve(null);
          } else {
            resolve(real);
          }
        },
      );
    });

    if (real === null) {
      return;
    }

    transaction.real = real;

    logger.debug("Running 'beforeEachValidation' hooks");
    await new Promise<void>((resolve, reject) => {
      this.runHooksForData(
        hooks && hooks.beforeEachValidationHooks,
        transaction,
        () => {
          if (this.hookHandlerError) {
            return reject(this.hookHandlerError);
          }
          resolve();
        },
      );
    });

    logger.debug("Running 'beforeValidation' hooks");
    await new Promise<void>((resolve, reject) => {
      this.runHooksForData(
        hooks && hooks.beforeValidationHooks[transaction.name],
        transaction,
        () => {
          if (this.hookHandlerError) {
            return reject(this.hookHandlerError);
          }
          resolve();
        },
      );
    });

    this.validateTransaction(test, transaction, () => {});
  }

  // TODO Rewrite this entire method.
  // Motivations:
  // 1. Mutations at place.
  // 2. Constant shadowing and reusage of "validationOutput" object where it could be avoided.
  // 3. Ambiguity between internal "results" and legacy "gavelResult[name].results".
  // 4. Mapping with for/of that affects prototype properties.
  validateTransaction(test: any, transaction: any, callback: () => void): void {
    logger.debug('Validating HTTP transaction by Gavel.js');
    let gavelResult: any = { fields: {} };

    try {
      gavelResult = gavel.validate(transaction.expected, transaction.real);
    } catch (validationError) {
      logger.debug('Gavel.js validation errored:', validationError);
      this.emitError(validationError as Error, test);
    }

    test.title = transaction.id;
    test.actual = transaction.real;
    test.expected = transaction.expected;
    test.request = transaction.request;

    // TODO
    // Gavel result MUST NOT be undefined. Check transaction runner tests
    // to find where and why it is.
    const { valid: isValid } = gavelResult;

    if (isValid) {
      test.status = 'pass';
    } else {
      test.status = 'fail';
    }

    // Warn about empty responses
    // Expected is as string, actual is as integer :facepalm:
    const isExpectedResponseStatusCodeEmpty = ['204', '205'].includes(
      test.expected.statusCode
        ? test.expected.statusCode.toString()
        : undefined,
    );
    const isActualResponseStatusCodeEmpty = ['204', '205'].includes(
      test.actual.statusCode ? test.actual.statusCode.toString() : undefined,
    );
    const hasBody = test.expected.body || test.actual.body;
    if (
      (isExpectedResponseStatusCodeEmpty || isActualResponseStatusCodeEmpty) &&
      hasBody
    ) {
      logger.warn(`\
${test.title} HTTP 204 and 205 responses must not \
include a message body: https://tools.ietf.org/html/rfc7231#section-6.3\
`);
    }

    // Create test message from messages of all validation errors
    let message = '';

    // Order-sensitive list of Gavel validation fields to output in the log
    // Note that Dredd asserts EXACTLY this order. Make sure to adjust tests upon change.
    const loggedFields = ['headers', 'body', 'statusCode'].filter(
      (fieldName: string) =>
        Object.prototype.hasOwnProperty.call(gavelResult.fields, fieldName),
    );

    loggedFields.forEach((fieldName: string) => {
      const fieldResult = gavelResult.fields[fieldName];
      (fieldResult.errors || []).forEach((gavelError: any) => {
        message += `${fieldName}: ${gavelError.message}\n`;
      });
    });

    test.message = message;

    // Set the validation results and the boolean verdict to the test object
    transaction.results = gavelResult;
    test.valid = isValid;
    test.errors = transaction.errors;
    test.results = transaction.results;

    // Propagate test object so 'after' hooks can modify it
    transaction.test = test;

    callback();
  }

  emitEnd(callback: () => void): void {
    let reporterCount = this.configuration.emitter.listeners('end').length;
    this.configuration.emitter.emit('end', () => {
      reporterCount--;
      if (reporterCount === 0) {
        callback();
      }
    });
  }
}

export default TransactionRunner;

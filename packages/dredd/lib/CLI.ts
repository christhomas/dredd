import console from 'console'; // Stubbed in tests by proxyquire
import fs from 'fs';
// Imported from the package root, not 'yargs/yargs'. yargs declares "type": "module" but
// ships 'yargs/yargs' as an extensionless file containing CommonJS. Node used to treat an
// extensionless file as CommonJS regardless; it now honours the package type, evaluates that
// file as ESM and fails on its first require(), so the CLI could not start at all on Node 22
// and later. The root entry resolves through exports to index.cjs and is the same factory.
import yargs from 'yargs';
import os from 'os';
import spawnArgs from 'spawn-args';
import { spawn as spawnSync } from 'cross-spawn';

import * as configUtils from './configUtils';
import Dredd from './Dredd';
import ignorePipeErrors from './ignorePipeErrors';
import interactiveConfig from './init';
import logger from './logger';
import { applyLoggingOptions } from './configuration';
import { spawn } from './childProcess';

import dreddOptions from '../options.json';
import packageData from '../package.json';

interface CLIOptions {
  exit?: (status: number) => void;
  custom?: any;
}

class CLI {
  cb: ((exitStatus: number) => any) | undefined;
  finished: boolean;
  exit: ((status: number) => void) | undefined;
  custom: any;
  optimist: any;
  argv: any;
  cliArgv: any;
  serverProcess: any;
  dreddInstance: any;
  server: any;
  wait: any;
  sigIntEventAdd: boolean | undefined;
  sigIntEventAdded: boolean | undefined;
  _processExit!: (exitStatus: number) => any;

  constructor(options: CLIOptions = {}, cb?: (exitStatus: number) => any) {
    this.cb = cb;
    this.finished = false;
    this.exit = options.exit;
    this.custom = options.custom || {};

    this.setExitOrCallback();

    if (!this.custom.cwd || typeof this.custom.cwd !== 'string') {
      this.custom.cwd = process.cwd();
    }

    if (!this.custom.argv || !Array.isArray(this.custom.argv)) {
      this.custom.argv = [];
    }
  }

  setOptimistArgv(): void {
    this.optimist = yargs(this.custom.argv)
      .usage(
        `\
Usage:
  $ dredd init

Or:
  $ dredd <path or URL to API description document> <URL of tested server> [OPTIONS]

Example:
  $ dredd ./api-description.apib http://127.0.0.1:3000 --dry-run\
`,
      )
      .options(dreddOptions)
      .version(false)
      .help(false)
      .exitProcess(false)
      .wrap(80);

    this.argv = this.optimist.argv;
    this.cliArgv = this.argv;
    applyLoggingOptions(this.argv);
  }

  // Gracefully terminate server
  stopServer(callback: () => void): void {
    if (!this.serverProcess || !this.serverProcess.spawned) {
      logger.debug('No backend server process to terminate.');
      return callback();
    }
    if (this.serverProcess.terminated) {
      logger.debug('The backend server process has already terminated');
      return callback();
    }
    logger.debug(
      'Terminating backend server process, PID',
      this.serverProcess.pid,
    );
    this.serverProcess.terminate({ force: true });
    this.serverProcess.on('exit', () => callback());
  }

  // This thing-a-ma-bob here is only for purpose of testing
  // It's basically a dependency injection for the process.exit function
  setExitOrCallback(): void {
    if (!this.cb) {
      if (this.exit && this.exit === process.exit) {
        this.sigIntEventAdd = true;
      }

      if (this.exit) {
        this._processExit = (exitStatus: number): void => {
          logger.debug(
            `Using configured custom exit() method to terminate the Dredd process with status '${exitStatus}'.`,
          );
          this.finished = true;
          this.stopServer(() => {
            this.exit!(exitStatus);
          });
        };
      } else {
        this._processExit = (exitStatus: number): void => {
          logger.debug(
            `Using native process.exit() method to terminate the Dredd process with status '${exitStatus}'.`,
          );
          this.stopServer(() => process.exit(exitStatus));
        };
      }
    } else {
      this._processExit = (exitStatus: number): any => {
        logger.debug(
          `Using configured custom callback to terminate the Dredd process with status '${exitStatus}'.`,
        );
        this.finished = true;
        if (this.sigIntEventAdded) {
          if (this.serverProcess && !this.serverProcess.terminated) {
            logger.debug('Killing backend server process before Dredd exits.');
            this.serverProcess.signalKill();
          }
          process.removeListener('SIGINT', this.commandSigInt);
        }
        this.cb!(exitStatus);
        return this;
      };
    }
  }

  moveBlueprintArgToPath(): void {
    // Transform path and p argument to array if it's not
    if (!Array.isArray(this.argv.path)) {
      this.argv.path = [this.argv.path];
      this.argv.p = this.argv.path;
    }
  }

  checkRequiredArgs(): void {
    let argError = false;

    // If 'blueprint' is missing
    if (!this.argv._[0]) {
      console.error('\nError: Must specify path to API description document.');
      argError = true;
    }

    // If 'endpoint' is missing
    if (!this.argv._[1]) {
      console.error('\nError: Must specify URL of the tested API instance.');
      argError = true;
    }

    // Show help if argument is missing
    if (argError) {
      console.error('\n');
      this.optimist.showHelp(console.error);
      this._processExit(1);
    }
  }

  runExitingActions(): void {
    // Run interactive config
    if (this.argv._[0] === 'init' || this.argv.init === true) {
      logger.debug('Starting interactive configuration.');
      this.finished = true;
      interactiveConfig(
        this.argv,
        (config: any) => {
          configUtils.save(config);
        },
        (err: any) => {
          if (err) {
            logger.error('Could not configure Dredd', err);
          }
          this._processExit(0);
        },
      );

      // Show help
    } else if (this.argv.help === true) {
      this.optimist.showHelp(console.error);
      this._processExit(0);

      // Show version
    } else if (this.argv.version === true) {
      let buildTime: string | number = 'unknown';
      try {
        const exePath = process.argv[1];
        const stats = fs.statSync(exePath);
        buildTime = Math.floor(stats.mtimeMs / 1000);
      } catch (err) { /* Intentionally ignored */ }
      console.log(`${packageData.name} v${packageData.version} [${(packageData as any).fork}] (${os.type()} ${os.release()}; ${os.arch()}) Build: ${buildTime}`);
      this._processExit(0);
    }
  }

  loadDreddFile(): void {
    const configPath = this.argv.config;
    logger.debug('Loading configuration file:', configPath);

    if (configPath && fs.existsSync(configPath)) {
      logger.debug(
        `Configuration '${configPath}' found, ignoring other arguments.`,
      );
      this.argv = configUtils.load(configPath);
    }

    // Overwrite saved config with cli arguments
    Object.keys(this.cliArgv).forEach((key: string) => {
      const value = this.cliArgv[key];
      if (key !== '_' && key !== '$0') {
        this.argv[key] = value;
      }
    });

    applyLoggingOptions(this.argv);
  }

  parseCustomConfig(): void {
    this.argv.custom = configUtils.parseCustom(this.argv.custom);
  }

  runServerAndThenDredd(): void {
    if (this.argv['dry-run']) {
      logger.debug('Dry-run mode enabled, skipping backend server startup.');
      this.runDredd(this.dreddInstance);
      return;
    }
    if (!this.argv.server) {
      logger.debug(
        'No backend server process specified, starting testing at once',
      );
      this.runDredd(this.dreddInstance);
    } else {
      logger.debug(
        'Backend server process specified, starting backend server and then testing',
      );

      const parsedArgs = spawnArgs(this.argv.server);
      const command = parsedArgs.shift();

      logger.debug(
        `Using '${command}' as a server command, ${JSON.stringify(
          parsedArgs,
        )} as arguments`,
      );
      this.serverProcess = spawn(command, parsedArgs);
      logger.debug(
        `Starting backend server process with command: ${this.argv.server}`,
      );

      this.serverProcess.stdout.setEncoding('utf8');
      this.serverProcess.stdout.on('data', (data: any) =>
        process.stdout.write(data.toString()),
      );

      this.serverProcess.stderr.setEncoding('utf8');
      this.serverProcess.stderr.on('data', (data: any) =>
        process.stdout.write(data.toString()),
      );

      this.serverProcess.on('signalTerm', () =>
        logger.debug('Gracefully terminating the backend server process'),
      );
      this.serverProcess.on('signalKill', () =>
        logger.debug('Killing the backend server process'),
      );

      this.serverProcess.on('crash', (exitStatus: number | null, killed: boolean) => {
        if (killed) {
          logger.debug('Backend server process was killed');
        }
      });

      this.serverProcess.on('exit', () => {
        logger.debug('Backend server process exited');
      });

      this.serverProcess.on('error', (err: Error) => {
        logger.error(
          'Command to start backend server process failed, exiting Dredd',
          err,
        );
        this._processExit(1);
      });

      // Ensure server is not running when dredd exits prematurely somewhere
      process.on('beforeExit', () => {
        if (this.serverProcess && !this.serverProcess.terminated) {
          logger.debug('Killing backend server process before Dredd exits');
          this.serverProcess.signalKill();
        }
      });

      // Ensure server is not running when dredd exits prematurely somewhere
      process.on('exit', () => {
        if (this.serverProcess && !this.serverProcess.terminated) {
          logger.debug("Killing backend server process on Dredd's exit");
          this.serverProcess.signalKill();
        }
      });

      const waitSecs = parseInt(this.argv['server-wait'], 10);
      const waitMilis = waitSecs * 1000;
      logger.debug(
        `Waiting ${waitSecs} seconds for backend server process to start`,
      );

      this.wait = setTimeout(() => {
        this.runDredd(this.dreddInstance);
      }, waitMilis);
    }
  }

  // This should be handled in a better way in the future:
  // https://github.com/apiaryio/dredd/issues/625
  logDebuggingInfo(config: any): void {
    logger.debug('Dredd version:', packageData.version);
    logger.debug('Node.js version:', process.version);
    logger.debug('Node.js environment:', process.versions);
    logger.debug('System version:', os.type(), os.release(), os.arch());
    try {
      const npmVersion = spawnSync('npm', ['--version'])
        .stdout.toString()
        .trim();
      logger.debug(
        'npm version:',
        npmVersion || 'unable to determine npm version',
      );
    } catch (err) {
      logger.debug('npm version: unable to determine npm version:', err);
    }
    logger.debug('Configuration:', JSON.stringify(config));
  }

  run(): void {
    try {
      for (const task of [
        this.setOptimistArgv,
        this.parseCustomConfig,
        this.runExitingActions,
        this.loadDreddFile,
        this.checkRequiredArgs,
        this.moveBlueprintArgToPath,
      ]) {
        task.call(this);
        if (this.finished) {
          return;
        }
      }

      const configurationForDredd = this.initConfig();
      this.logDebuggingInfo(configurationForDredd);

      this.dreddInstance = this.initDredd(configurationForDredd);
    } catch (e: any) {
      this.exitWithStatus(e);
    }

    ignorePipeErrors(process);

    try {
      this.runServerAndThenDredd();
    } catch (e: any) {
      logger.error(e.message, e.stack);
      this.stopServer(() => {
        this._processExit(2);
      });
    }
  }

  lastArgvIsApiEndpoint(): this {
    // When API description path is a glob, some shells are automatically expanding globs and concating
    // result as arguments so I'm taking last argument as API endpoint server URL and removing it
    // from optimist's args
    this.server = this.argv._[this.argv._.length - 1];
    this.argv._.splice(this.argv._.length - 1, 1);
    return this;
  }

  takeRestOfParamsAsPath(): this {
    // And rest of arguments concating to 'path' and 'p' opts, duplicates are filtered out later
    this.argv.path = this.argv.path.concat(this.argv._);
    this.argv.p = this.argv.path;
    return this;
  }

  initConfig(): any {
    this.lastArgvIsApiEndpoint().takeRestOfParamsAsPath();

    const cliConfig: any = { ...this.argv, server: this.server };

    // Push first argument (without some known configuration --key) into paths
    if (!cliConfig.path) {
      cliConfig.path = [];
    }
    cliConfig.path.push(this.argv._[0]);

    // Merge "this.custom" which is an input of CLI constructor
    // (used for internal testing), and "cliConfig" which is a result
    // of merge upon "argv". Otherwise "custom" key from "dredd.yml"
    // is always overridden by "this.custom".
    cliConfig.custom = { ...this.custom, ...(cliConfig.custom || {}) };

    return cliConfig;
  }

  initDredd(configuration: any): Dredd {
    return new Dredd(configuration);
  }

  commandSigInt(): void {
    logger.error('\nShutting down from keyboard interruption (Ctrl+C)');
    this.dreddInstance.transactionsComplete(() => this._processExit(0));
  }

  runDredd(dreddInstance: any): this {
    if (this.sigIntEventAdd) {
      // Handle SIGINT from user
      this.sigIntEventAdded = !(this.sigIntEventAdd = false);
      process.on('SIGINT', this.commandSigInt);
    }

    logger.debug('Running Dredd instance.');
    dreddInstance.run((error: any, stats: any) => {
      logger.debug('Dredd instance run finished.');
      this.exitWithStatus(error, stats);
    });

    return this;
  }

  exitWithStatus(error: any, stats?: any): void {
    if (error) {
      if (error.message) {
        logger.error(error.message);
      }
      this._processExit(1);
    }

    if (stats.failures + stats.errors > 0) {
      this._processExit(1);
    } else {
      this._processExit(0);
    }
  }
}

export default CLI;

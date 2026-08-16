import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import clone from 'clone';
import express from 'express';
import fs from 'fs';
import https from 'https';
import path from 'path';
import spawn from 'cross-spawn';

import net from 'net';

import logger from '../../build/logger.js';
import reporterOutputLogger from '../../build/reporters/reporterOutputLogger.js';
import { createRequire } from 'module';

// import.meta.url is the ES module equivalent of __dirname and __filename.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use port 0 to let the OS assign random available ports, avoiding EADDRINUSE
// conflicts between test suites. The actual port is read back from
// server.address().port after listen.
export const DEFAULT_SERVER_PORT = 0;

// Get a free port by briefly binding to port 0, reading the assigned port,
// and closing. Useful for CLI tests that need to know the port before starting.
export function getFreePort(callback) {
  const srv = net.createServer();
  srv.listen(0, () => {
    const { port } = srv.address();
    srv.close(() => callback(null, port));
  });
}
const DREDD_BIN = createRequire(import.meta.url).resolve('../../bin/dredd');

// Records logging during runtime of a given function. Given function
// is provided with a 'next' callback. The final callback is provided
// with:
//
// - err (Error) - in case the recordLogging function failed (never)
// - args (array) - array of all arguments the 'next' callback obtained
//                  from the 'fn' function
// - logging (string) - the recorded logging output
export const recordLogging = (fn, callback) => {
  const loggerSilent = !!logger.consoleTransport.silent;
  const reporterOutputLoggerSilent =
    !!reporterOutputLogger.consoleTransport.silent;

  // Supress Dredd's console output (remove if debugging)
  logger.consoleTransport.silent = true;
  reporterOutputLogger.consoleTransport.silent = true;

  let logging = '';
  const stripAnsi = (str) => str.replace(/\u001b\[\d+m/g, '');
  const record = (info) => {
    logging += `${stripAnsi(info.level)}: ${info.message}\n`;
  };

  logger.on('data', record);
  reporterOutputLogger.on('data', record);

  fn((...args) => {
    logger.removeListener('data', record);
    logger.consoleTransport.silent = loggerSilent;

    reporterOutputLogger.removeListener('data', record);
    reporterOutputLogger.consoleTransport.silent = reporterOutputLoggerSilent;

    callback(null, args, logging);
  });
};

// Helper function which records incoming server request to given
// server runtime info object.
function recordServerRequest(serverRuntimeInfo, req) {
  // Initial values before any request is made:
  // - requestedOnce = false
  // - requested = false
  serverRuntimeInfo.requestedOnce = !serverRuntimeInfo.requested;
  serverRuntimeInfo.requested = true;

  const recordedReq = {
    method: req.method,
    url: req.url,
    headers: clone(req.headers),
    body: clone(req.body),
  };

  serverRuntimeInfo.lastRequest = recordedReq;

  if (!serverRuntimeInfo.requests[req.url]) {
    serverRuntimeInfo.requests[req.url] = [];
  }
  serverRuntimeInfo.requests[req.url].push(recordedReq);

  if (!serverRuntimeInfo.requestCounts[req.url]) {
    serverRuntimeInfo.requestCounts[req.url] = 0;
  }
  serverRuntimeInfo.requestCounts[req.url] += 1;
}

// Helper to get SSL credentials. Uses dummy self-signed certificate.
function getSSLCredentials() {
  const httpsDir = path.join(__dirname, '../fixtures/https');
  return {
    key: fs.readFileSync(path.join(httpsDir, 'server.key'), 'utf8'),
    cert: fs.readFileSync(path.join(httpsDir, 'server.crt'), 'utf8'),
  };
}

// Creates a new Express.js instance. Automatically records everything about
// requests which the server has recieved during runtime. Sets JSON body parser
// and 'application/json' as default value for the Content-Type header. In
// callback of the listen() function it additionally provides server runtime
// information (useful for inspecting in tests):
//
// - process (object) - the server process object (has the .close() method)
// - requested (boolean) - whether the server recieved at least one request
// - requests (object) - recorded requests
//     - *endpointUrl* (array)
//         - (object)
//             - method: GET (string)
//             - headers (object)
//             - body (string)
// - requestCounts (object)
//     - *endpointUrl*: 0 (number, default) - number of requests to the endpoint
export const createServer = (options = {}) => {
  const protocol = options.protocol || 'http';
  const bodyParserInstance =
    options.bodyParser || bodyParser.json({ size: '5mb' });

  const serverRuntimeInfo = {
    requestedOnce: false,
    requested: false,
    lastRequest: null,
    requests: {},
    requestCounts: {},
    reset: function reset() {
      this.requestedOnce = false;
      this.requested = false;
      this.lastRequest = null;
      this.requests = {};
      this.requestCounts = {};
    },
  };

  let app = express();
  app.use(bodyParserInstance);
  app.use((req, res, next) => {
    recordServerRequest(serverRuntimeInfo, req);
    res.type('json').status(200); // sensible defaults, can be overriden
    next();
  });
  if (protocol === 'https') {
    app = https.createServer(getSSLCredentials(), app);
  }

  // Monkey-patching the app.listen() function. The 'port' argument
  // is made optional, defaulting to the 'DEFAULT_SERVER_PORT' value.
  // The callback is provided not only with error object, but also with
  // runtime info about the server (what requests it got etc.).
  const originalListen = app.listen;
  app.listen = function listen(port, callback) {
    if (typeof port === 'function') {
      [callback, port] = Array.from([port, DEFAULT_SERVER_PORT]);
    }
    return originalListen.call(this, port, (err) =>
      callback(err, serverRuntimeInfo),
    );
  };
  return app;
};

// Runs given Dredd class instance against localhost server on given (or default)
// server port. Automatically records all Dredd logging ouput. The error isn't passed
// as the first argument, but as part of the result, which is convenient in
// tests. Except of 'err' and 'logging' returns also 'stats' which is what the Dredd
// instance returns as test results.
export const runDredd = (dredd, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }
  if (dredd.configuration.endpoint == null) {
    dredd.configuration.endpoint = `http://127.0.0.1:${serverPort}`;
  }

  if (dredd.configuration.options == null) {
    dredd.configuration.options = {};
  }
  if (dredd.configuration.options.loglevel == null) {
    dredd.configuration.options.loglevel = 'debug';
  }

  let stats;

  recordLogging(
    (next) => dredd.run(next),
    (err, args, logging) => {
      if (err) {
        return callback(err);
      }

      [err, stats] = Array.from(args);
      callback(null, { err, stats, logging });
    },
  );
};

// Runs given Express.js server instance and then runs given Dredd class instance.
// Collects their runtime information and provides it to the callback.
export const runDreddWithServer = (dredd, app, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }

  const server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) {
      return callback(err);
    }

    // When using port 0, read the actual assigned port
    const actualPort = server.address().port;
    runDredd(dredd, actualPort, (error, dreddRuntimeInfo) =>
      server.close(() =>
        callback(error, { server: serverRuntimeInfo, dredd: dreddRuntimeInfo }),
      ),
    );
  });
};

// Strip ANSI escape codes from a string
function stripAnsiCodes(str) {
  return str.replace(/\u001b\[\d+m/g, '');
}

// Runs CLI command with given arguments. Records and provides stdout, stderr
// and also 'output', which is the two combined. Also provides 'exitStatus'
// of the process. ANSI escape codes are stripped from captured output.
function runCommand(command, args, spawnOptions = {}, callback) {
  if (typeof spawnOptions === 'function') {
    [callback, spawnOptions] = Array.from([spawnOptions, undefined]);
  }

  let stdout = '';
  let stderr = '';
  let output = '';

  const cli = spawn(command, args, spawnOptions);

  cli.stdout.on('data', (data) => {
    stdout += data;
    output += data;
  });
  cli.stderr.on('data', (data) => {
    stderr += data;
    output += data;
  });

  cli.on('exit', (exitStatus) =>
    callback(null, {
      stdout: stripAnsiCodes(stdout),
      stderr: stripAnsiCodes(stderr),
      output: stripAnsiCodes(output),
      exitStatus,
    }),
  );
}

// Runs Dredd as a CLI command, with given arguments.
export const runCLI = (args, spawnOptions, callback) =>
  runCommand('node', [DREDD_BIN].concat(args), spawnOptions, callback);

// Runs given Express.js server instance and then runs Dredd command with given
// arguments. Collects their runtime information and provides it to the callback.
// When using port 0, replaces DEFAULT_SERVER_PORT placeholder in args with actual port.
export const runCLIWithServer = (args, app, serverPort, callback) => {
  if (typeof serverPort === 'function') {
    [callback, serverPort] = Array.from([serverPort, DEFAULT_SERVER_PORT]);
  }

  const server = app.listen(serverPort, (err, serverRuntimeInfo) => {
    if (err) {
      return callback(err);
    }

    // When using port 0, replace port placeholder in CLI args with actual port
    const actualPort = server.address().port;
    const resolvedArgs = args.map((arg) =>
      typeof arg === 'string'
        ? arg.replace(/127\.0\.0\.1:0\b/g, `127.0.0.1:${actualPort}`)
        : arg,
    );

    runCLI(resolvedArgs, (error, cliInfo) =>
      server.close(() =>
        callback(error, { server: serverRuntimeInfo, dredd: cliInfo }),
      ),
    );
  });
};

// Lists running processes as { pid, command }, where command is the full command line.
//
// This used to be ps-node, which shells out to `wmic` on Windows. Microsoft removed wmic
// from current Windows images, so the lookup failed with "'wmic' is not recognized", the
// helpers below could find nothing, and servers spawned by the tests were never reaped -
// later tests then blocked on the ports those servers still held until the job timed out.
// Asking each platform directly costs one dependency less and works on both.
const parsePosix = (stdout) =>
  stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(' ');
      return {
        pid: Number(line.slice(0, separator)),
        command: line.slice(separator + 1),
      };
    });

// ConvertTo-Json gives a bare object rather than an array when exactly one process matches,
// and CommandLine is null for processes the query cannot read.
const parseWindows = (stdout) => {
  const parsed = JSON.parse(stdout || '[]');
  return (Array.isArray(parsed) ? parsed : [parsed]).map((entry) => ({
    pid: Number(entry.ProcessId),
    command: entry.CommandLine || '',
  }));
};

const listProcesses = (callback) => {
  const windows = process.platform === 'win32';
  const command = windows ? 'powershell' : 'ps';
  const args = windows
    ? [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress',
      ]
    : ['-A', '-o', 'pid=,args='];

  const child = spawn(command, args);
  let stdout = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.on('error', (err) => callback(err));
  child.on('close', () => {
    try {
      callback(null, windows ? parseWindows(stdout) : parsePosix(stdout));
    } catch (err) {
      callback(err);
    }
  });
};

// Processes whose command line matches the pattern, never counting this process itself.
//
// The pattern is a regular expression, which is what ps-node took and what the callers
// pass - one of them builds `endless-ignore-term.+[^=]test/fixtures/hooks.js` to tell two
// otherwise identical processes apart. Matching literally instead looks right against the
// callers that pass a plain path and silently never fires for that one.
const lookup = (pattern, callback) => {
  let expression;
  try {
    expression = new RegExp(pattern);
  } catch (err) {
    return callback(err);
  }
  return listProcesses((err, processes) =>
    callback(
      err,
      (processes || []).filter(
        (entry) => entry.pid !== process.pid && expression.test(entry.command),
      ),
    ),
  );
};

// Checks whether there's a process with name matching given pattern.
export const isProcessRunning = (pattern, callback) =>
  lookup(pattern, (err, processes) => callback(err, !!(processes && processes.length)));

// Kills process with given PID if the process exists. Otherwise
// does nothing.
export const kill = (pid, callback) => {
  if (process.platform === 'win32') {
    const taskkill = spawn('taskkill', ['/F', '/T', '/PID', pid]);
    return taskkill.on('exit', () => callback());
    // No error handling - we don't care about the result of the command
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {
    // PID doesn't exist; ignore
  }
  // If the PID doesn't exist, process.kill() throws - we do not care
  process.nextTick(callback);
};

// Kills processes which have names matching given pattern. Does
// nothing if there are no matching processes.
export const killAll = (pattern, callback) => {
  return lookup(pattern, (err, processes) => {
    if (err || !processes.length) {
      return callback(err);
    }

    let remaining = processes.length;
    processes.forEach((entry) =>
      kill(entry.pid, () => {
        remaining--;
        if (remaining === 0) callback();
      }),
    );
  });
};

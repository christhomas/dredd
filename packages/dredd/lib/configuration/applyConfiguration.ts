import { EventEmitter } from 'events';

import logger from '../logger.js';
import getProxySettings from '../getProxySettings.js';
import applyLoggingOptions from './applyLoggingOptions.js';
import validateConfig from './validateConfig.js';
import normalizeConfig from './normalizeConfig.js';

export const DEFAULT_CONFIG: any = {
  http: {},
  endpoint: null,
  custom: {
    cwd: process.cwd(),
  },
  path: [],
  apiDescriptions: [],
  'dry-run': false,
  reporter: null,
  output: null,
  header: null,
  user: null,
  'inline-errors': false,
  details: false,
  method: [],
  only: [],
  color: true,
  loglevel: 'warn',
  sorted: false,
  names: false,
  hookfiles: [],
  language: 'nodejs',
  'hooks-worker-timeout': 5000,
  'hooks-worker-connect-timeout': 1500,
  'hooks-worker-connect-retry': 500,
  'hooks-worker-after-connect-wait': 100,
  'hooks-worker-term-timeout': 5000,
  'hooks-worker-term-retry': 500,
  'hooks-worker-handler-host': '127.0.0.1',
  'hooks-worker-handler-port': 61321,
};

/**
 * Deep merge two objects. Arrays and primitives from source override target.
 * Objects are merged recursively.
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Flattens given configuration Object, removing nested "options" key.
// This makes it possible to use nested "options" key without introducing
// a breaking change to the library's public API.
function flattenConfig(config: any): any {
  // Rename "root.server" key to "root.endpoint".
  const aliasedConfig = { ...config };
  if ('server' in aliasedConfig) {
    aliasedConfig.endpoint = aliasedConfig.server;
    delete aliasedConfig.server;
  }

  const { options: nestedOptions, ...rootOptions } = aliasedConfig;

  if (nestedOptions) {
    logger.warn('Deprecated usage of `options` in Dredd configuration.');
  }

  // Nested options take precedence over root options
  return deepMerge(rootOptions, nestedOptions || {});
}

export function resolveConfig(config: any): {
  config: any;
  warnings: string[];
  errors: string[];
} {
  const flattened = flattenConfig(config);
  const merged = deepMerge(DEFAULT_CONFIG, flattened);

  // Set "emitter" property explicitly to preserve its prototype.
  // During deep merge, prototypes are lost, breaking EventEmitter.
  merged.emitter = config.emitter || new EventEmitter();

  // Validate Dredd configuration
  const { warnings, errors } = validateConfig(merged);
  warnings.forEach((message: string) => logger.warn(message));
  errors.forEach((message: string) => logger.error(message));

  // Fail fast upon any Dredd configuration errors
  if (errors.length > 0) {
    throw new Error('Could not configure Dredd');
  }

  return {
    config: normalizeConfig(merged),
    warnings,
    errors,
  };
}

function applyConfiguration(config: any): any {
  const { config: resolvedConfig } = resolveConfig(config);

  applyLoggingOptions(resolvedConfig);

  // Log information about the HTTP proxy settings
  const proxySettings = getProxySettings(process.env);
  if (proxySettings.length) {
    logger.warn(
      `HTTP(S) proxy specified by environment variables: ${proxySettings.join(
        ', ',
      )}. ` +
        'Please read documentation on how Dredd works with proxies: ' +
        'https://dredd.org/en/latest/how-it-works/#using-https-proxy',
    );
  }

  return resolvedConfig;
}

export default applyConfiguration;

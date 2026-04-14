/**
 * Removes options that are no longer supported by Dredd.
 */
export function removeUnsupportedOptions(config: any): any {
  const result = { ...config };
  delete result.q;
  delete result.silent;
  delete result.t;
  delete result.timestamp;
  delete result.blueprintPath;
  delete result.b;
  delete result.sandbox;
  return result;
}

export function coerceToArray(value: any): any[] {
  if (typeof value === 'string') return [value];
  if (value == null) return [];
  return value;
}

export function coerceToBoolean(value: any): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value) return true;
  return false;
}

/**
 * Appends authorization header when supplied with "user" option.
 */
export function coerceUserOption(config: any): any {
  if (config.user == null) return config;
  const result = { ...config };
  const token = Buffer.from(result.user).toString('base64');
  const authHeader = `Authorization: Basic ${token}`;
  const existingHeaders = result.header || [];
  result.header = [authHeader, ...coerceToArray(existingHeaders)];
  delete result.user;
  return result;
}

export function coerceApiDescriptions(value: any): any[] {
  const arr = coerceToArray(value);
  return arr.map((content: any, index: number) => ({
    location: `configuration.apiDescriptions[${index}]`,
    content: content && typeof content === 'object' && 'content' in content
      ? content.content
      : content,
  }));
}

/**
 * Coerces the given deprecated value of the "level" option
 * and returns the supported value for "loglevel" option.
 */
export function coerceDeprecatedLevelOption(config: any): any {
  if (!('l' in config) && !('level' in config)) return config;
  const result = { ...config };
  const level = result.l || result.level;
  delete result.l;
  delete result.level;

  if (['silly', 'debug', 'verbose'].includes(level)) {
    result.loglevel = 'debug';
  } else if (level === 'error') {
    result.loglevel = 'error';
  } else if (level === 'silent') {
    result.loglevel = 'silent';
  } else {
    result.loglevel = 'warn';
  }
  return result;
}

export function coerceDeprecatedDataOption(config: any): any {
  if (config.data == null) return config;
  const result = { ...config };
  const dataEntries = Object.entries(result.data).map(([location, content]: [string, any]) => {
    if (typeof content === 'string') {
      return { location, content };
    }
    return { location: content.filename, content: content.raw };
  });
  result.apiDescriptions = [
    ...coerceToArray(result.apiDescriptions),
    ...dataEntries,
  ];
  delete result.data;
  return result;
}

export function coerceColorOption(config: any): any {
  if (!('c' in config)) return config;
  const result = { ...config };
  result.color = coerceToBoolean(result.c);
  delete result.c;
  return result;
}

function coerceOptions(config: any): any {
  let result = { ...config };

  // Coerce standard options
  result.color = coerceToBoolean(result.color);
  result.apiDescriptions = coerceApiDescriptions(result.apiDescriptions);
  result.reporter = coerceToArray(result.reporter);
  result.output = coerceToArray(result.output);
  result.header = coerceToArray(result.header);
  result.method = coerceToArray(result.method).map((m: string) => m.toUpperCase());
  result.only = coerceToArray(result.only);
  result.path = coerceToArray(result.path);
  result.hookfiles = coerceToArray(result.hookfiles);

  // Coerce user option (adds auth header)
  result = coerceUserOption(result);

  // Coerce deprecated options
  result = coerceDeprecatedLevelOption(result);
  result = coerceDeprecatedDataOption(result);
  result = coerceColorOption(result);

  return result;
}

export default function normalizeConfig(config: any): any {
  return coerceOptions(removeUnsupportedOptions(config));
}

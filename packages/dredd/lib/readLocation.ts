import fs from 'fs';
import { promisify } from 'util';
import defaultRequest, { httpRequestAsync } from './httpRequest';

import isURL from './isURL';

const readFile = promisify(fs.readFile);

function getErrorFromResponse(response: any, hasBody: boolean): Error {
  const contentType = response.headers['content-type'];
  if (hasBody) {
    const bodyDescription = contentType
      ? `'${contentType}' body`
      : 'body without Content-Type';
    return new Error(
      `Dredd got HTTP ${response.statusCode} response with ${bodyDescription}`,
    );
  }
  return new Error(
    `Dredd got HTTP ${response.statusCode} response without body`,
  );
}

async function readRemoteFileAsync(uri: string, options: any = {}): Promise<string> {
  const httpOptions: any = { ...options.http || {} };
  httpOptions.uri = uri;
  httpOptions.timeout = 5000;

  // Support custom request function (used in tests)
  if (options.request) {
    return new Promise((resolve, reject) => {
      options.request(httpOptions, (error: any, response: any, responseBody: any) => {
        if (error) return reject(error);
        if (!response) return reject(new Error('Unexpected error'));
        if (!responseBody || response.statusCode < 200 || response.statusCode >= 300) {
          return reject(getErrorFromResponse(response, !!responseBody));
        }
        resolve(responseBody);
      });
    });
  }

  const { response, body } = await httpRequestAsync(httpOptions);
  if (!body || response.statusCode < 200 || response.statusCode >= 300) {
    throw getErrorFromResponse(response, !!body);
  }
  return body as string;
}

export async function readLocationAsync(location: string, options: any = {}): Promise<string> {
  if (isURL(location)) {
    return readRemoteFileAsync(location, options);
  }
  return readFile(location, 'utf8');
}

/**
 * Legacy callback interface for backward compatibility.
 */
export default function readLocation(
  location: string,
  options: any,
  callback?: (err: any, data?: string) => void,
): void {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  readLocationAsync(location, options)
    .then((data) => callback!(null, data))
    .catch((err) => callback!(err));
}

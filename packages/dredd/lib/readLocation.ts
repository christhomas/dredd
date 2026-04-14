import fs from 'fs';
import defaultRequest from './httpRequest';

import isURL from './isURL';

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

function readRemoteFile(uri: string, options: any, callback?: (err: any, data?: string) => void): void {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  const request = options.request || defaultRequest;

  const httpOptions: any = { ...options.http || {}};
  httpOptions.uri = uri;
  httpOptions.timeout = 5000; // ms, limits both connection time and server response time

  try {
    request(httpOptions, (error: any, response: any, responseBody: any) => {
      if (error) {
        callback!(error);
      } else if (!response) {
        callback!(new Error('Unexpected error'));
      } else if (
        !responseBody ||
        response.statusCode < 200 ||
        response.statusCode >= 300
      ) {
        callback!(getErrorFromResponse(response, !!responseBody));
      } else {
        callback!(null, responseBody);
      }
    });
  } catch (error) {
    process.nextTick(() => callback!(error));
  }
}

function readLocalFile(path: string, callback: (err: any, data?: string) => void): void {
  fs.readFile(path, 'utf8', (error: any, data: string) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, data);
  });
}

export default function readLocation(location: string, options: any, callback?: (err: any, data?: string) => void): void {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  if (isURL(location)) {
    readRemoteFile(location, options, callback);
  } else {
    readLocalFile(location, callback!);
  }
}

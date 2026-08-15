import caseless from 'caseless';
import defaultRequest from './httpRequest.js';

import defaultLogger from './logger.js';

/**
 * Performs the HTTP request as described in the 'transaction.request' object.
 * Supports both async and callback patterns.
 */
export async function performRequestAsync(
  uri: string,
  transactionReq: any,
  options: any = {},
): Promise<any> {
  const logger = options.logger || defaultLogger;
  const request = options.request || defaultRequest;

  const httpOptions: any = { ...(options.http || {}) };
  httpOptions.proxy = false;
  httpOptions.followRedirect = false;
  httpOptions.encoding = null;
  httpOptions.method = transactionReq.method;
  httpOptions.uri = uri;

  httpOptions.body = getBodyAsBuffer(
    transactionReq.body,
    transactionReq.bodyEncoding,
  );
  httpOptions.headers = normalizeContentLengthHeader(
    transactionReq.headers,
    httpOptions.body,
  );

  const protocol = httpOptions.uri.split(':')[0].toUpperCase();
  const logUri = httpOptions.uri.split('?')[0];
  logger.debug(
    `Performing ${protocol} request to the server under test: ` +
      `${httpOptions.method} ${logUri}`,
  );

  return new Promise((resolve, reject) => {
    request(httpOptions, (error: any, response: any, responseBody: any) => {
      logger.debug(`Handling ${protocol} response from the server under test`);
      if (error) {
        reject(error);
      } else {
        resolve(createTransactionResponse(response, responseBody));
      }
    });
  });
}

/**
 * Legacy callback interface for backward compatibility.
 */
function performRequest(
  uri: string,
  transactionReq: any,
  options: any,
  callback?: (err: any, res?: any) => void,
): void {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }
  performRequestAsync(uri, transactionReq, options)
    .then((result) => callback!(null, result))
    .catch((error) => callback!(error));
}

/**
 * Coerces the HTTP request body to a Buffer
 */
export function getBodyAsBuffer(
  body: string | Buffer,
  encoding: string | undefined,
): Buffer {
  return body instanceof Buffer
    ? body
    : Buffer.from(
        `${body || ''}`,
        normalizeBodyEncoding(encoding) as BufferEncoding,
      );
}

/**
 * Returns the encoding as either 'utf-8' or 'base64'.
 */
export function normalizeBodyEncoding(encoding: string | undefined): string {
  if (!encoding) {
    return 'utf-8';
  }

  switch (encoding.toLowerCase()) {
    case 'utf-8':
    case 'utf8':
      return 'utf-8';
    case 'base64':
      return 'base64';
    default:
      throw new Error(
        `Unsupported encoding: '${encoding}' (only UTF-8 and ` +
          'Base64 are supported)',
      );
  }
}

/**
 * Detects an existing Content-Length header and overrides the user-provided
 * header value in case it's out of sync with the real length of the body.
 */
export function normalizeContentLengthHeader(
  headers: any,
  body: Buffer,
  options: any = {},
): any {
  const logger = options.logger || defaultLogger;

  const modifiedHeaders = { ...headers };
  const calculatedValue = Buffer.byteLength(body);
  const name = caseless(modifiedHeaders).has('Content-Length');
  if (name) {
    const value = parseInt(modifiedHeaders[name], 10);
    if (value !== calculatedValue) {
      modifiedHeaders[name] = `${calculatedValue}`;
      logger.warn(
        `Specified Content-Length header is ${value}, but the real ` +
          `body length is ${calculatedValue}. Using ${calculatedValue} instead.`,
      );
    }
  } else {
    modifiedHeaders['Content-Length'] = `${calculatedValue}`;
  }
  return modifiedHeaders;
}

/**
 * Real transaction response object factory.
 */
export function createTransactionResponse(response: any, body: Buffer): any {
  const transactionRes: any = {
    statusCode: response.statusCode,
    headers: { ...response.headers },
  };
  if (Buffer.byteLength(body || '')) {
    transactionRes.bodyEncoding = detectBodyEncoding(body);
    transactionRes.body = body.toString(transactionRes.bodyEncoding);
  }
  return transactionRes;
}

/**
 * Detects body encoding
 */
export function detectBodyEncoding(body: Buffer): string {
  return body.toString().includes('\ufffd') ? 'base64' : 'utf-8';
}

export default performRequest;

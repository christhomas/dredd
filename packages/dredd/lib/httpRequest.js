import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Minimal HTTP request function that replaces the deprecated 'request' library.
 * Provides the same callback signature: (error, response, body).
 *
 * @param {Object} options
 * @param {string} options.uri - Full URL to request
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.headers] - Request headers
 * @param {string|Buffer} [options.body] - Request body
 * @param {boolean} [options.followRedirect=true] - Whether to follow redirects
 * @param {null} [options.encoding] - Set to null for binary (Buffer) response
 * @param {number} [options.timeout] - Request timeout in ms
 * @param {Function} callback - (error, response, body)
 */
export default function httpRequest(options, callback) {
  const url = new URL(options.uri);
  const transport = url.protocol === 'https:' ? https : http;

  const reqOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: options.method || 'GET',
    headers: options.headers || {},
  };

  if (options.timeout) {
    reqOptions.timeout = options.timeout;
  }

  const req = transport.request(reqOptions, (res) => {
    // Handle redirects if followRedirect is not explicitly false
    if (
      options.followRedirect !== false &&
      res.statusCode >= 300 &&
      res.statusCode < 400 &&
      res.headers.location
    ) {
      const redirectOptions = { ...options, uri: res.headers.location,};
      return httpRequest(redirectOptions, callback);
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const raw = Buffer.concat(chunks);
      // Return Buffer when encoding is null (binary mode), string otherwise
      const body = options.encoding === null ? raw : raw.toString('utf-8');
      callback(null, res, body);
    });
  });

  req.on('error', (error) => callback(error));

  req.on('timeout', () => {
    req.destroy(new Error('ESOCKETTIMEDOUT'));
  });

  if (options.body) {
    req.write(options.body);
  }

  req.end();
}

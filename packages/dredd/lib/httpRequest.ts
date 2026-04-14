import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Minimal HTTP request function that replaces the deprecated 'request' library.
 * Provides the same callback signature: (error, response, body).
 */
export default function httpRequest(options: any, callback: (error: any, response?: any, body?: any) => void): void {
  const url = new URL(options.uri);
  const transport = url.protocol === 'https:' ? https : http;

  const reqOptions: any = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: options.method || 'GET',
    headers: options.headers || {},
  };

  if (options.timeout) {
    reqOptions.timeout = options.timeout;
  }

  const req = transport.request(reqOptions, (res: any) => {
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

    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => {
      const raw = Buffer.concat(chunks);
      // Return Buffer when encoding is null (binary mode), string otherwise
      const body = options.encoding === null ? raw : raw.toString('utf-8');
      callback(null, res, body);
    });
  });

  req.on('error', (error: Error) => callback(error));

  req.on('timeout', () => {
    req.destroy(new Error('ESOCKETTIMEDOUT'));
  });

  if (options.body) {
    req.write(options.body);
  }

  req.end();
}

import http from 'http';
import https from 'https';
import { URL } from 'url';

interface HttpRequestOptions {
  uri: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  followRedirect?: boolean;
  encoding?: null;
  timeout?: number;
  [key: string]: any;
}

interface HttpRequestResult {
  response: any;
  body: string | Buffer;
}

/**
 * Minimal HTTP request function. Returns a Promise with { response, body }.
 * Also supports legacy callback signature for backward compatibility.
 */
export function httpRequestAsync(options: HttpRequestOptions): Promise<HttpRequestResult> {
  return new Promise((resolve, reject) => {
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
      if (
        options.followRedirect !== false &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        return httpRequestAsync({ ...options, uri: res.headers.location })
          .then(resolve)
          .catch(reject);
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const body = options.encoding === null ? raw : raw.toString('utf-8');
        resolve({ response: res, body });
      });
    });

    req.on('error', (error: Error) => reject(error));

    req.on('timeout', () => {
      req.destroy(new Error('ESOCKETTIMEDOUT'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Legacy callback interface for backward compatibility.
 */
export default function httpRequest(
  options: any,
  callback: (error: any, response?: any, body?: any) => void,
): void {
  httpRequestAsync(options)
    .then(({ response, body }) => callback(null, response, body))
    .catch((error) => callback(error));
}

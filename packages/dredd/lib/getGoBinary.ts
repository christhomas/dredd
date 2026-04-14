import childProcess from 'child_process';
import path from 'path';

// Docs:
// - https://golang.org/doc/code.html#GOPATH
// - https://golang.org/cmd/go/#hdr-GOPATH_environment_variable
export async function getGoBinaryAsync(): Promise<string> {
  const goBin = process.env.GOBIN;
  if (goBin) {
    return goBin;
  }
  if (process.env.GOPATH) {
    return path.join(process.env.GOPATH, 'bin');
  }
  // Use callback-based exec to support sinon stubbing in tests
  return new Promise((resolve, reject) => {
    childProcess.exec('go env GOPATH', (err, stdout) => {
      if (err) return reject(err);
      resolve(path.join(stdout.trim(), 'bin'));
    });
  });
}

/**
 * Legacy callback interface for backward compatibility.
 */
export default function getGoBinary(
  callback: (err: any, result?: string) => void,
): void {
  getGoBinaryAsync()
    .then((result) => callback(null, result))
    .catch((err) => callback(err));
}

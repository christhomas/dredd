import { fileURLToPath } from 'url';
import path from 'path';
import { assert } from 'chai';

import resolveModule from '../../build/resolveModule.js';

// import.meta.url is the ES module equivalent of __dirname and __filename.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('resolveModule()', () => {
  const workingDirectory = path.join(__dirname, '..', 'fixtures');

  it('resolves a local module name', () => {
    assert.equal(
      resolveModule(workingDirectory, 'requiredModule'),
      path.join(workingDirectory, 'requiredModule'),
    );
  });

  it('resolves a local module name with .js extension', () => {
    assert.equal(
      resolveModule(workingDirectory, 'requiredModule.js'),
      path.join(workingDirectory, 'requiredModule.js'),
    );
  });
});

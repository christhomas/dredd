import { assert, use } from 'chai';
import chaiJSONschema from 'chai-json-schema';

import fixtures from './fixtures/index.js';

use(chaiJSONschema);

export { assert, fixtures };

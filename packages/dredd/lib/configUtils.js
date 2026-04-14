import clone from 'clone';
import fs from 'fs';
import yaml from 'js-yaml';

export function save(argsOrigin, path) {
  if (!path) {
    path = './dredd.yml';
  }

  const args = clone(argsOrigin);

  [args.blueprint, args.endpoint] = args._;

  Object.keys(args).forEach((key) => {
    if (key.length === 1) {
      delete args[key];
    }
  });

  delete args.$0;
  delete args._;

  fs.writeFileSync(path, yaml.dump(args));
}

export function load(path) {
  if (!path) {
    path = './dredd.yml';
  }

  const yamlData = fs.readFileSync(path);
  const data = yaml.load(yamlData);

  data._ = [data.blueprint, data.endpoint];

  delete data.blueprint;
  delete data.endpoint;

  return data;
}

export function parseCustom(customArray) {
  const output = {};
  if (Array.isArray(customArray)) {
    for (const string of customArray) {
      const splitted = string.split(/:(.+)?/);
      const [key, value] = splitted;
      output[key] = value;
    }
  }
  return output;
}

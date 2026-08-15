import clone from 'clone';
import fs from 'fs';
import { load as loadYaml, dump as dumpYaml } from 'js-yaml';

export function save(argsOrigin: any, path?: string): void {
  if (!path) {
    path = './dredd.yml';
  }

  const args = clone(argsOrigin);

  [args.blueprint, args.endpoint] = args._;

  Object.keys(args).forEach((key: string) => {
    if (key.length === 1) {
      delete args[key];
    }
  });

  delete args.$0;
  delete args._;

  fs.writeFileSync(path, dumpYaml(args));
}

export function load(path?: string): any {
  if (!path) {
    path = './dredd.yml';
  }

  const yamlData = fs.readFileSync(path);
  const data: any = loadYaml(yamlData as any);

  data._ = [data.blueprint, data.endpoint];

  delete data.blueprint;
  delete data.endpoint;

  return data;
}

export function parseCustom(customArray: any): Record<string, string> {
  const output: Record<string, string> = {};
  if (Array.isArray(customArray)) {
    for (const string of customArray) {
      const splitted = string.split(/:(.+)?/);
      const [key, value] = splitted;
      output[key] = value;
    }
  }
  return output;
}

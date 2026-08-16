#!/usr/bin/env node
// Alters the 'node_modules' to remove a C++ dependency of the API Blueprint
// parser before the 'npm pack' creates the package, and brings the bundled dependencies
// into the package so pack can include them whatever layout the installer produced

const fs = require('fs');
const path = require('path');
 
const { rimrafSync } = require('rimraf');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const SYMLINKS_LOG = path.join(PACKAGE_DIR, 'prepack-symlinks.log');
const APIB_PARSER_PATH = path.join(PACKAGE_DIR, 'node_modules', '@antimatter-studios', 'apib-parser');

function readPackageJson(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json')));
}

function writePackageJson(packageDir, packageData) {
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(packageData, null, 2));
}

/**
 * Resolves where a package actually lives, rather than assuming it was hoisted to the root
 * 'node_modules'. yarn and npm hoist, pnpm links from a store, and the previous code only
 * worked under the first two - it created a symlink to a path that did not exist, and the walk
 * then failed reading the package.json behind it.
 *
 * @param {string} dependencyName
 * @returns {string} absolute path to the package directory
 */
function resolvePackageDir(dependencyName, fromDir) {
  const searchPaths = [fromDir, PACKAGE_DIR, path.resolve(PACKAGE_DIR, '..', '..')];

  try {
    return path.dirname(require.resolve(`${dependencyName}/package.json`, { paths: searchPaths }));
  } catch (e) {
    // A package that does not expose ./package.json through its exports field still has one on
    // disk, so fall back to looking for it directly.
    const candidates = searchPaths.map((dir) => path.join(dir, 'node_modules', dependencyName));
    const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'package.json')));

    if (!found) {
      throw new Error(`cannot resolve "${dependencyName}" from ${searchPaths.join(' or ')}`, {
        cause: e,
      });
    }

    return found;
  }
}

/**
 * Goes through the whole dependency tree of a given top-level dependency
 * and makes sure all packages involved are accessible in the local
 * 'node_modules' directory at least in form of symlinks.
 *
 * This is useful if the project uses yarn workspaces, but wants to publish
 * the package with npm and uses 'bundledDependencies'. 'npm pack' is not able
 * to find packages if they're put into the root 'node_modules' by yarn and
 * wouldn't be able to bundle them.
 *
 * @param {string} dependencyName Dependency tree root
 */
const linkedDependencies = new Set();

function symlinkDependencyTreeToLocalNodeModules(dependencyName, fromDir = PACKAGE_DIR) {
  if (linkedDependencies.has(dependencyName)) {
    return;
  }
  linkedDependencies.add(dependencyName);

  // Resolved from the package that requires it, not from the root: a transitive dependency is
  // only visible beside its parent under pnpm, while yarn and npm hoisted it to the top.
  const realDependencyPath = resolvePackageDir(dependencyName, fromDir);
  const localDependencyPath = path.join(PACKAGE_DIR, 'node_modules', dependencyName);

  console.log('\nlinking dependency tree for "%s"', dependencyName);
  console.log('%s: %s', dependencyName, localDependencyPath);

  // A path that exists as a symlink is not enough: npm pack follows it and records where it
  // points, which under pnpm is a store path outside the package. The registry rejects such a
  // tarball outright. Replace it with the real files.
  if (fs.existsSync(localDependencyPath) && fs.lstatSync(localDependencyPath).isSymbolicLink()) {
    console.log('%s is a symlink, replacing it with its contents...', dependencyName);
    fs.unlinkSync(localDependencyPath);
    fs.appendFileSync(SYMLINKS_LOG, `${dependencyName}\n`);
  }

  if (!fs.existsSync(localDependencyPath)) {
    console.log('dependency does not exist!');
    const localDependencyPathDir = path.dirname(localDependencyPath);

    if (!fs.existsSync(localDependencyPathDir)) {
      console.log('dependency does not have parent directory, creating...');
      fs.mkdirSync(localDependencyPathDir, { recursive: true });
    }

    console.log('copying "%s" from "%s"', dependencyName, realDependencyPath);

    // Copied rather than symlinked. npm pack follows a symlink and records the path it
    // resolves to, which lies outside the package - under pnpm that is a store path, and the
    // registry rejects the tarball outright: "invalid path: package/../../node_modules/...".
    // Nested node_modules are skipped because each dependency in the tree is copied in its own
    // right, which is the flat layout bundledDependencies expects.
    fs.cpSync(realDependencyPath, localDependencyPath, {
      recursive: true,
      dereference: true,
      filter: (source) => path.basename(source) !== 'node_modules',
    });
    console.log('successfully copied "%s" to "%s"!', dependencyName, localDependencyPath);
    console.log('updating symlink configuration...');
    fs.appendFileSync(SYMLINKS_LOG, `${dependencyName}\n`);
  } else {
    console.log('%s exists, skipping...', dependencyName);
  }

  const packageData = readPackageJson(realDependencyPath);
  const dependencies = Object.keys(packageData.dependencies || {});
  console.log('linking dependencies of "%s":\n', dependencyName, dependencies);
  dependencies.forEach((dependency) => {
    symlinkDependencyTreeToLocalNodeModules(dependency, realDependencyPath);
  });
}

// make sure all bundled deps are accessible in the local 'node_modules' dir
const packageData = readPackageJson(PACKAGE_DIR);
// Nothing is bundled now that the parsers are published packages in their own right; the
// removal of the C++ parser above is what this script still exists for.
const { bundledDependencies = [] } = packageData;
bundledDependencies.forEach((dependency) => symlinkDependencyTreeToLocalNodeModules(dependency));

// alter @antimatter-studios/apib-parser's package.json so it doesn't depend on protagonist
const apibParserPackageData = readPackageJson(APIB_PARSER_PATH);
delete apibParserPackageData.dependencies.protagonist;
delete apibParserPackageData.optionalDependencies.protagonist;
writePackageJson(APIB_PARSER_PATH, apibParserPackageData);

// get rid of protagonist everywhere
[
  path.join(PACKAGE_DIR, 'node_modules', 'protagonist'),
  path.join(PACKAGE_DIR, '..', '..', 'node_modules', 'protagonist'),
]
  .filter((protagonistPath) => fs.existsSync(protagonistPath))
  .forEach((protagonistPath) => rimrafSync(protagonistPath));

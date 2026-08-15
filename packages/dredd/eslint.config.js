import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '.github/**',
      '.vscode/**',
      'build/**',
      'coverage/**',
      'docs/**',
      'site-packages/**',
      '**/*.ts',
    ],
  },
  {
    // The CLI entry point has no extension, so it needs naming explicitly.
    files: ['**/*.js', '**/*.mjs', 'bin/dredd'],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Using 'console' is perfectly okay for a Node.js CLI tool
      'no-console': 'off',
      // Allow function hoisting (common JS pattern)
      'no-use-before-define': ['error', { functions: false }],
      // ANSI escape codes in regex are intentional (stripping terminal colors)
      'no-control-regex': 'off',
      // An unused catch binding documents what is being swallowed
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    // Hook files and helper scripts stand in for a user's own project, which is CommonJS.
    files: ['test/fixtures/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.mocha },
    },
    rules: {
      // Test callback signatures expose params that may not be used
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];

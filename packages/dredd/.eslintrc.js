module.exports = {
  extends: ['airbnb-base', 'prettier'],
  env: {
    node: true,
  },
  rules: {
    // Using 'console' is perfectly okay for a Node.js CLI tool
    'no-console': 'off',

    // Allow underscore-prefixed exports for test-only functions
    'no-underscore-dangle': 'off',

    // These are intentionally kept off as they conflict with common
    // Node.js patterns used throughout the codebase
    'no-param-reassign': 'off', // Common in Express middleware, hooks, and callbacks
    'consistent-return': 'off', // Early returns in callbacks
    'no-plusplus': 'off', // i++ is standard
    'no-restricted-syntax': 'off', // for...of is fine in Node
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off', // Mixed .js/.ts codebase
    'max-len': 'off', // Handled by prettier

    // Allow function hoisting (common JS pattern)
    'no-use-before-define': ['error', { functions: false }],

    // Methods that don't use this are common in event handler classes
    'class-methods-use-this': 'off',

    // ANSI escape codes in regex are intentional (stripping terminal colors)
    'no-control-regex': 'off',
  },
  overrides: [
    {
      // Test files commonly need patterns that airbnb considers errors
      files: ['test/**/*.js', 'test/**/*.ts'],
      rules: {
        // Tests instantiate classes for side effects (sinon stubs, assertions)
        'no-new': 'off',
        // Test callback signatures expose params that may not be used
        'no-unused-vars': ['error', { args: 'none' }],
      },
    },
  ],
};

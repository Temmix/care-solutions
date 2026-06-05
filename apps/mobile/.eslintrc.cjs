/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@care/eslint-config'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', '.expo/', 'babel.config.js'],
};

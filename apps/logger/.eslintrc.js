/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@care/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  root: true,
  env: {
    node: true,
  },
  rules: {
    'no-console': 'off',
  },
};

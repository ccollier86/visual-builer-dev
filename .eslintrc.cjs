module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: false,
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  plugins: ['@typescript-eslint', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
  ],
  rules: {
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          ArrowFunctionExpression: false,
          ClassDeclaration: true,
          FunctionDeclaration: true,
          MethodDefinition: true,
        },
      },
    ],
    'jsdoc/require-param-type': 'off',
    'jsdoc/require-returns-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'src/tests/biopsych-intake-template.schema.json',
    'src/tests/sample-data/**',
  ],
};

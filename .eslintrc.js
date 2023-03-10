module.exports = {
  env: {
    jest: true,
    node: true,
  },
  extends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'eslint-config-jsy',
    'prettier',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react'],
  settings: {},
  rules: {
    'no-undef': 'off',
    'no-labels': 'off',
    'no-restricted-syntax': 'off',
    'no-case-declarations': 'off',
  },
}

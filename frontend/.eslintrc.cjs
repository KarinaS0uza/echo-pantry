module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'echo'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  overrides: [
    {
      files: ['*.cjs', 'tooling/**/*.{cjs,mjs}', 'tests/**/*.js'],
      env: { node: true },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
      files: ['src/components/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'echo/token-values': 'error',
        'echo/no-style-props': 'error',
      },
    },
  ],
};

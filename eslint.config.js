import js from '@eslint/js';
import globals from 'globals';
import promise from 'eslint-plugin-promise';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/node_modules/', '**/dist/'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      promise,
    },
    rules: {
      // Promise rules
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/no-return-in-finally': 'warn',

      // Possible Errors
      'comma-dangle': ['error', 'only-multiline'],
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-unexpected-multiline': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Best Practices
      'no-fallthrough': 'error',
      'no-octal': 'error',
      'no-self-assign': 'error',
      'no-unused-labels': 'error',

      // Variables (use TS version)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],

      // Stylistic Issues
      'comma-spacing': 'error',
      'eol-last': 'error',
      'indent': ['error', 2, { SwitchCase: 1 }],
      'keyword-spacing': 'error',
      'max-len': ['error', 120, 2],
      'new-parens': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': ['error', { skipBlankLines: false }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': 'error',
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',

      // ECMAScript 6
      'arrow-parens': ['error', 'always'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'constructor-super': 'error',
      'no-class-assign': 'error',
      'no-confusing-arrow': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-this-before-super': 'error',
      'prefer-const': 'error',
    },
  },
];

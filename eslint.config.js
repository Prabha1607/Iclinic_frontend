// eslint.config.js
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // ignore dist folder
  globalIgnores(['dist']),

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser, 
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      react: reactPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Prettier
      'prettier/prettier': [
        'error',
        { singleQuote: true, trailingComma: 'all', semi: true, printWidth: 88 },
      ],
      // General
      'no-empty': 'warn',
    },
  },
])
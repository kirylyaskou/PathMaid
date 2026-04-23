import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'
import importX from 'eslint-plugin-import-x'
import react from 'eslint-plugin-react'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'

const IIFE_MESSAGE =
  'IIFE в JSX запрещено. Вынеси в под-компонент, useMemo или чистую функцию в lib/ (см. CLAUDE.md → React 19 Conventions).'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'src-tauri/**'],
  },
  {
    files: ['engine/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    plugins: {
      boundaries,
      'import-x': importX,
      react,
    },
    settings: {
      react: { version: '19' },
      'boundaries/elements': [
        { type: 'app',      pattern: ['src/app/**'],      mode: 'full' },
        { type: 'pages',    pattern: ['src/pages/**'],    mode: 'full' },
        { type: 'widgets',  pattern: ['src/widgets/**'],  mode: 'full' },
        { type: 'features', pattern: ['src/features/**'], mode: 'full' },
        { type: 'entities', pattern: ['src/entities/**'], mode: 'full' },
        { type: 'shared',   pattern: ['src/shared/**'],   mode: 'full' },
      ],
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        rules: [
          { from: { type: 'app' },      allow: { to: { type: ['pages', 'widgets', 'features', 'entities', 'shared'] } } },
          { from: { type: 'pages' },    allow: { to: { type: ['widgets', 'features', 'entities', 'shared'] } } },
          { from: { type: 'widgets' },  allow: { to: { type: ['features', 'entities', 'shared'] } } },
          { from: { type: 'features' }, allow: { to: { type: ['entities', 'shared'] } } },
          { from: { type: 'entities' }, allow: { to: { type: ['shared'] } } },
          { from: { type: 'shared' },   disallow: { to: { type: '*' } } },
        ],
      }],

      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',

      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/no-unstable-nested-components': ['error', { allowAsProps: false }],
      'react/jsx-key': 'error',

      'no-restricted-syntax': ['error',
        {
          selector: "JSXExpressionContainer > CallExpression[callee.type='ArrowFunctionExpression']",
          message: IIFE_MESSAGE,
        },
        {
          selector: "JSXExpressionContainer > CallExpression[callee.type='FunctionExpression']",
          message: IIFE_MESSAGE,
        },
      ],

      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
)

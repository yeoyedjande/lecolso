import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import i18next from 'eslint-plugin-i18next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'playwright-report',
    'test-results',
    // Fichiers générés
    'src/lib/api/schema.d.ts',
    'src/routeTree.gen.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Pas de « as » (frontend/CLAUDE.md) : une exception se justifie par un eslint-disable commenté
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },
  {
    // Fichiers de routes TanStack : ils exportent « Route » et le plugin du routeur gère le
    // découpage et le rechargement à chaud de leurs composants
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Accès à l'API : uniquement via lib/api/client.ts, appelé par les hooks de features/<domaine>/api.ts
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api/**', 'src/features/*/api.ts', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'openapi-fetch', message: 'Passer par un hook de features/<domaine>/api.ts.' },
            {
              name: '@/lib/api/client',
              message: 'Passer par un hook de features/<domaine>/api.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Aucun texte visible en dur : tout passe par i18n (frontend/CLAUDE.md)
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx', 'src/**/*.stories.tsx', 'src/components/ui/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
  {
    files: ['src/sw.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
])

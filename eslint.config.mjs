import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import sonarjs from 'eslint-plugin-sonarjs'
import vitest from '@vitest/eslint-plugin'

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    reactHooks.configs.flat.recommended,
    eslintConfigPrettier,
    sonarjs.configs.recommended,
    {
        files: ['**/*.test.ts', '**/*.test.tsx'],
        plugins: {
            vitest,
        },
        rules: {
            ...vitest.configs.recommended.rules,
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            'react/prop-types': 'off',
        },
    },
)

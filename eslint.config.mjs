import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import sonarjs from 'eslint-plugin-sonarjs'
import jest from 'eslint-plugin-jest'
import testingLibrary from 'eslint-plugin-testing-library'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

export default defineConfig(
    {
        ignores: [
            '.agents/**',
            '.expo/**',
            'dist/**',
            'web-build/**',
            'android/**',
            'ios/**',
            'coverage/**',
            '.yarn/**',
            'node_modules/**',
            '.github/scripts/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked.map((config) => ({
        ...config,
        files: config.files ?? ['**/*.ts', '**/*.tsx'],
    })),
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
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
        ...jest.configs['flat/recommended'],
        rules: {
            ...jest.configs['flat/recommended'].rules,
            '@typescript-eslint/unbound-method': 'off', // Replaced by jest/unbound-method for tests
            'jest/unbound-method': 'error',
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@testing-library/react-native',
                            importNames: ['fireEvent'],
                            message: 'Use userEvent instead of fireEvent.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.test.tsx'],
        ...testingLibrary.configs['flat/react'],
        rules: {
            ...testingLibrary.configs['flat/react'].rules,
            'testing-library/no-dom-import': ['error', 'react-native'],
            'testing-library/prefer-user-event': 'warn',
            'testing-library/prefer-user-event-setup': 'warn',
            'jest/no-restricted-matchers': [
                'warn',
                {
                    toBeTruthy:
                        'Avoid `toBeTruthy()` for rendered elements. Prefer `expect(element).toBeOnTheScreen()` or `expect(element).toBeVisible()`.',
                    toBeDefined:
                        'Avoid `toBeDefined()` for rendered elements. Prefer `expect(element).toBeOnTheScreen()`.',
                },
            ],
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            'no-unused-vars': 'off', // or "@typescript-eslint/no-unused-vars": "off",
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: ['*.js', '*.mjs', 'plugins/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
)

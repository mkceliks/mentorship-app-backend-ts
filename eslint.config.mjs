import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.test.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                jest: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
        },
    },
];

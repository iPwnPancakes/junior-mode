import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/renderer/**',
            '.local/**',
            'learning-platform/**',
        ],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    { languageOptions: { globals: globals.node } },
    {
        files: ['web/src/**'],
        languageOptions: { globals: globals.browser },
        plugins: { 'react-hooks': reactHooks },
        rules: reactHooks.configs.recommended.rules,
    },
    {
        files: ['desktop/preload.cjs'],
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
];

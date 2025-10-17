import { globalIgnores } from '@eslint/config-helpers';
import { defineConfig } from 'eslint/config';
import EslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import neostandard from 'neostandard';
import tseslint from 'typescript-eslint';

export default defineConfig(
	globalIgnores(['.work/', 'dist/', 'src/_esm', '**/*.d.ts']),
	...neostandard({
		ts: true,
		env: ['browser'],
		semi: true,
		globals: {
			__DEV__: 'readonly',
			__PROD__: 'readonly',
		},
	}),
	tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			camelcase: 'off',
			'no-dupe-class-members': 'off',
			'no-useless-constructor': 'off',
			'no-void': 'off',
			'space-before-function-paren': [
				'error',
				{
					anonymous: 'always',
					named: 'never',
					asyncArrow: 'always',
				},
			],
			'@stylistic/lines-between-class-members': 'off',
			'@stylistic/spaced-comment': [
				'error',
				'always',
				{
					markers: ['/'],
					exceptions: ['/'],
				},
			],

			'import-x/export': 'off',
			'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
			'import-x/order': [
				'error',
				{
					'newlines-between': 'never',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],

			'@typescript-eslint/adjacent-overload-signatures': 'error',
			'@typescript-eslint/array-type': [
				'error',
				{ default: 'array-simple' },
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
					disallowTypeAnnotations: false,
				},
			],
			// '@typescript-eslint/explicit-member-accessibility': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/lines-between-class-members': 'off',
			'@typescript-eslint/member-delimiter-style': 'off',
			'@typescript-eslint/member-ordering': [
				'error',
				{
					default: [
						'public-static-field',
						'private-static-field',
						'public-instance-field',
						'private-instance-field',
						'public-constructor',
						'private-constructor',
					],
				},
			],
			'@typescript-eslint/method-signature-style': 'off',
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
					leadingUnderscore: 'allow',
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
					leadingUnderscore: 'allow',
				},
				{
					selector: 'memberLike',
					format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
					leadingUnderscore: 'allowSingleOrDouble',
					trailingUnderscore: 'allowSingleOrDouble',
				},
				{
					selector: 'memberLike',
					modifiers: ['requiresQuotes'],
					format: null,
				},
				{ selector: 'import', format: null },
				{
					selector: 'variableLike',
					format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
					leadingUnderscore: 'allowSingleOrDouble',
					trailingUnderscore: 'allowSingleOrDouble',
				},
				{
					selector: 'variableLike',
					format: null,
					filter: {
						regex: '^(?:child_process|ResEdit)$',
						match: true,
					},
				},
				{
					selector: 'memberLike',
					format: null,
					filter: {
						regex: '^(?:DOS_Windows16|DOS_Windows32|NT_Windows32)$',
						match: true,
					},
				},
			],
			'@typescript-eslint/no-empty-function': [
				'error',
				{ allow: ['protected-constructors', 'private-constructors'] },
			],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-redeclare': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'@typescript-eslint/no-useless-constructor': 'error',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/prefer-includes': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/prefer-promise-reject-errors': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'@typescript-eslint/strict-boolean-expressions': [
				'error',
				{ allowNullableBoolean: true },
			],
		},
	},
	{
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		extends: [tseslint.configs.disableTypeChecked],
	},
	{
		files: ['./*.js', 'examples/**/*.js', 'tools/**/*.js'],
		languageOptions: {
			globals: globals.node,
		},
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	{
		files: ['build/**/*.js'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
	EslintConfigPrettier,
	{
		rules: {
			curly: ['error', 'all'],
		},
	}
);

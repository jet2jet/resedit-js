import * as path from 'path';
import { fileURLToPath } from 'url';

const thisDir = fileURLToPath(new URL('.', import.meta.url));

export default {
	preset: 'ts-jest',
	clearMocks: true,
	testEnvironment: 'node',
	testMatch: ['<rootDir>/src/test/basic/**/*.ts'],
	moduleNameMapper: {
		'^@/(.*)\\.js$': '<rootDir>/src/main/$1',
		'^@/(.*)$': '<rootDir>/src/main/$1',
		'(.+)\\.js': '$1',
	},
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
				useESM: true,
				diagnostics: {
					ignoreCodes: ['TS151001'],
				},
			},
		],
	},
	globals: {
		__TEST_PLATFORM__: 'any',
		__TEST_INPUT_ROOT__: path.resolve(thisDir, 'test/input'),
		__TEST_TEMPDIR_ROOT__: path.resolve(thisDir, '.work/test'),
		__TEST_TOOL_ROOT__: path.resolve(thisDir, 'tools'),
	},
};

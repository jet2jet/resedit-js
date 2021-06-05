const path = require('path');

module.exports = {
	preset: 'ts-jest',
	clearMocks: true,
	testEnvironment: 'node',
	testMatch: ['<rootDir>/src/test/basic/**/*.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/main/$1',
	},
	globals: {
		__TEST_PLATFORM__: 'any',
		__TEST_INPUT_ROOT__: path.resolve(__dirname, 'test/input'),
		__TEST_TEMPDIR_ROOT__: path.resolve(__dirname, '.work/test'),
		__TEST_TOOL_ROOT__: path.resolve(__dirname, 'tools'),
		'ts-jest': {
			tsconfig: 'tsconfig.test.json',
		},
	},
};

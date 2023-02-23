const path = require('path');

module.exports = {
	preset: 'ts-jest',
	clearMocks: true,
	testEnvironment: 'node',
	testMatch: ['<rootDir>/src/test/basic/**/*.ts'],
	moduleNameMapper: {
		'^@/(.*)\\.js$': '<rootDir>/src/main/$1',
		'^@/(.*)$': '<rootDir>/src/main/$1',
		'(.+)\\.js': '$1',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
			},
		],
	},
	globals: {
		__TEST_PLATFORM__: 'any',
		__TEST_INPUT_ROOT__: path.resolve(__dirname, 'test/input'),
		__TEST_TEMPDIR_ROOT__: path.resolve(__dirname, '.work/test'),
		__TEST_TOOL_ROOT__: path.resolve(__dirname, 'tools'),
	},
};

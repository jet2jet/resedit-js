import base from './jest.config.basic.js';

export default {
	...base,
	testMatch: ['<rootDir>/src/test/win/**/!(*.d.ts)@(.ts)'],
	globals: {
		...base.globals,
		__TEST_PLATFORM__: 'x64',
		__TEST_IGNORE_256_ICON__: process.env.TEST_IGNORE_256_ICON
			? 'true'
			: '',
	},
};

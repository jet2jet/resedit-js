
const base = require('./jest.config.basic');
base.testMatch = ['<rootDir>/src/test/win/**/*.ts'];
base.globals.__TEST_PLATFORM__ = 'x86';
base.globals.__TEST_IGNORE_256_ICON__ = process.env.TEST_IGNORE_256_ICON ? 'true' : '';

module.exports = base;

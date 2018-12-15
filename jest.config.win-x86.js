
const base = require('./jest.config.basic');
base.testMatch = ['<rootDir>/src/test/win/**/*.ts'];
base.globals.__TEST_PLATFORM__ = 'x86';

module.exports = base;

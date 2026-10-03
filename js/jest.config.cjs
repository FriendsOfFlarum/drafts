const config = require('@flarum/jest-config')();

module.exports = {
  ...config,
  // Passing moduleNameMapper as an option would replace the core mappings, so extend them instead.
  moduleNameMapper: {
    ...config.moduleNameMapper,
    '^ext:flarum/tags/(.*)$': '<rootDir>/tests/stubs/flarum-tags.ts',
  },
};

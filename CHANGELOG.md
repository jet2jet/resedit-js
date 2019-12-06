# Changelog

## v0.3.0

- Throw error if specified executable binary is signed (#10)
- Implemented PE checksum calculation (#8, thanks to @AlexanderOMara)
- (Internal change) Updated package dependencies for developments
  - TypeScript version is updated to 3.7.x, so the type definitions might be incompatible for older version of TypeScript (especially <3.4.x)

## v0.2.2

- Fix width and height usage for icon group, especially when loading from an icon file (#5)

## v0.2.1

- Fix the build paths to match package.json file (#3, thanks to @AlexanderOMara)

## v0.2.0

- Fix some bugs as followings:
  - Fix adding new section entry to executable
  - Fix changing section addresses on replacement
  - Fix parsing icon resource data and icon file data
- Add `is32bit` method for `NtExecutable` and `removeAllStrings` method for `VersionInfo`

## v0.1.0

- Initial version

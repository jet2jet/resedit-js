# Changelog

## v0.7.0

- Add `NtExecutable.createEmpty` which creates 'empty' executable data
- Add ESM (ES Module) support
- Fix some minor bugs

## v0.6.0

- Add support for extra data, which is not a part of any sections, on parsing/generating executables
- Add `alignment` parameter for `generateExecutableWithSign`

## v0.5.2

- Add predefined digest algorithms and support OIDs for `getDigestAlgorithm` and `getEncryptionAlgorithm`
- Fix calculating executable digest for binaries which previously contained signed information

## v0.5.1

- Rename `getPublicKeyData` to `getCertificateData`
  - `getPublicKeyData` can still be used now, but will be no longer called in the future.
- Re-export types used by `SignerObject`

## v0.5.0

- Improve usability for some classes, such as `VersionInfo` and `IconGroupEntry`
- Update descriptions for some types / methods
- Add support for multiple certificates on `SignerObject.getPublicKeyData`

## v0.4.0

- Added signing process function (#14), which enables to generate signed executable binaries
  - Additionally, signed executables are now supported on `NtExecutable.from` with explicit option. (On `NtExecutable.generate` signed information will be lost.)
- Support for `ArrayBufferView` as an input data for some methods (e.g. `NtExecutable.from` and `IconFile.from`)
  - TypedArray (e.g. `Uint8Array`), `DataView`, and Node.js `Buffer` class are subclasses of `ArrayBufferView`, so these classes now can be used as input data directly.

## v0.3.1

- Added missing string table rounding up for `VersionInfo` (#13, thanks to @AlexanderOMara)

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

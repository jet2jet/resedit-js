[![NPM version](https://badge.fury.io/js/resedit.svg)](https://www.npmjs.com/package/resedit)
[![Build Status](https://travis-ci.org/jet2jet/resedit-js.svg?branch=master)](https://travis-ci.org/jet2jet/resedit-js)

# resedit-js

(Beta) resedit-js is a library that manipulates resouces contained by Windows Executable files. All implementations are written in JavaScript (TypeScript), so there are no further restrictions for running environment.

## Install

```
npm install resedit
```

## Supported formats

- Windows Executables (PE Format, such as `.exe` and `.dll`), both 32-bit and 64-bit, are supported.
  - Executables for 16-bit Windows is not supported.
  - Signed executables are not supported and throw an error when calling `NtExecutable.from`.
- `.res` file is not supported now.
- PNG-based icon data is supported on `require('resedit').Resource.IconGroupEntry` class.

## Notes

- **It is not strongly recommended that the destination executable file is equal to the source executable file.**
- Using from command-line is not supported now.

## Examples

For more APIs, please see `dist` directory of the package. And, [some test codes](./src/test) may help you for usages.

```js
const ResEdit = require('resedit');
const fs = require('fs');

// load and parse data
let data = fs.readFileSync('MyApp.exe');
let exe = ResEdit.NtExecutable.from(data.buffer);
let res = ResEdit.NtExecutableResource.from(exe);

// rewrite resources
// - You can use helper classes as followings:
//   - ResEdit.Resource.IconGroupEntry: access icon resource data
//   - ResEdit.Resource.StringTable: access string resource data
//   - ResEdit.Resource.VersionInfo: access version info data
let viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
let vi = viList[0];
vi.fixedInfo.fileVersionMS = 0x10001; // '1.1'
vi.fixedInfo.fileVersionLS = 0;
// ('lang: 1033' means 'en-US', 'codepage: 1200' is the default codepage)
vi.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    FileDescription: 'My application',
    FileVersion: '1.1',
    ProductName: 'My product',
  }
);
vi.outputToResourceEntries(res.entries);

// write to another binary
res.outputResource(exe);
let newBinary = exe.generate();
fs.writeFileSync('MyApp_modified.exe', new Buffer(newBinary));
```

## License

[MIT License](./LICENSE)

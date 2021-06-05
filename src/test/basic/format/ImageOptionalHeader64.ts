import ImageOptionalHeader64 from '@/format/ImageOptionalHeader64';
import { getFieldOffset } from '../../util/structure';

// The definition:
//
// typedef struct _IMAGE_OPTIONAL_HEADER64 {
//   WORD                 Magic;
//   BYTE                 MajorLinkerVersion;
//   BYTE                 MinorLinkerVersion;
//   DWORD                SizeOfCode;
//   DWORD                SizeOfInitializedData;
//   DWORD                SizeOfUninitializedData;
//   DWORD                AddressOfEntryPoint;
//   DWORD                BaseOfCode;
//   ULONGLONG            ImageBase;
//   DWORD                SectionAlignment;
//   DWORD                FileAlignment;
//   WORD                 MajorOperatingSystemVersion;
//   WORD                 MinorOperatingSystemVersion;
//   WORD                 MajorImageVersion;
//   WORD                 MinorImageVersion;
//   WORD                 MajorSubsystemVersion;
//   WORD                 MinorSubsystemVersion;
//   DWORD                Win32VersionValue;
//   DWORD                SizeOfImage;
//   DWORD                SizeOfHeaders;
//   DWORD                CheckSum;
//   WORD                 Subsystem;
//   WORD                 DllCharacteristics;
//   ULONGLONG            SizeOfStackReserve;
//   ULONGLONG            SizeOfStackCommit;
//   ULONGLONG            SizeOfHeapReserve;
//   ULONGLONG            SizeOfHeapCommit;
//   DWORD                LoaderFlags;
//   DWORD                NumberOfRvaAndSizes;
//   IMAGE_DATA_DIRECTORY DataDirectory[IMAGE_NUMBEROF_DIRECTORY_ENTRIES];
// } IMAGE_OPTIONAL_HEADER64, *PIMAGE_OPTIONAL_HEADER64;

const FIELDS = [
	['magic', 2],
	['majorLinkerVersion', 1],
	['minorLinkerVersion', 1],
	['sizeOfCode', 4],
	['sizeOfInitializedData', 4],
	['sizeOfUninitializedData', 4],
	['addressOfEntryPoint', 4],
	['baseOfCode', 4],
	['imageBase', 8],
	['sectionAlignment', 4],
	['fileAlignment', 4],
	['majorOperatingSystemVersion', 2],
	['minorOperatingSystemVersion', 2],
	['majorImageVersion', 2],
	['minorImageVersion', 2],
	['majorSubsystemVersion', 2],
	['minorSubsystemVersion', 2],
	['win32VersionValue', 4],
	['sizeOfImage', 4],
	['sizeOfHeaders', 4],
	['checkSum', 4],
	['subsystem', 2],
	['dllCharacteristics', 2],
	['sizeOfStackReserve', 8],
	['sizeOfStackCommit', 8],
	['sizeOfHeapReserve', 8],
	['sizeOfHeapCommit', 8],
	['loaderFlags', 4],
	['numberOfRvaAndSizes', 4],
] as const;

const TOTAL_DATA_SIZE = getFieldOffset(FIELDS, null);

describe('ImageOptionalHeader64', () => {
	describe.each([undefined, 32] as const)(
		'Binary data offset is %s',
		(dataOffset) => {
			const actualDataOffset = dataOffset ?? 0;
			let dummyData: ArrayBuffer;
			beforeEach(() => {
				dummyData = new ArrayBuffer(TOTAL_DATA_SIZE + actualDataOffset);
			});
			it('should satisfy that ImageOptionalHeader64.size is the total data size', () => {
				expect(ImageOptionalHeader64.size).toEqual(TOTAL_DATA_SIZE);
			});
			it('should satisfy that ImageOptionalHeader64.DEFAULT_MAGIC is 0x020b', () => {
				expect(ImageOptionalHeader64.DEFAULT_MAGIC).toEqual(0x020b);
			});
			FIELDS.forEach((args) => {
				const [fieldName, fieldSize] = args;
				it(`should read ${args[0]} field correctly`, () => {
					const dataView = new DataView(dummyData);
					const offset = getFieldOffset(FIELDS, fieldName);
					// To restrict 'args' type, use args[1] instead of fieldSize
					if (args[1] === 8) {
						dataView.setUint32(
							actualDataOffset + offset,
							Number.MAX_SAFE_INTEGER % 0x100000000,
							true
						);
						dataView.setUint32(
							actualDataOffset + offset + 4,
							Math.floor(Number.MAX_SAFE_INTEGER / 0x100000000),
							true
						);
						const header = ImageOptionalHeader64.from(
							dummyData,
							dataOffset
						);
						expect(header[fieldName]).toEqual(
							Number.MAX_SAFE_INTEGER
						);

						// test bigint
						// TODO: remove 'as' on TS 4.3
						const fieldNameBigInt = `${args[0]}BigInt` as `${typeof args[0]}BigInt`;
						dataView.setUint32(
							actualDataOffset + offset,
							0x76543210,
							true
						);
						dataView.setUint32(
							actualDataOffset + offset + 4,
							0xfedcba98,
							true
						);
						expect(header[fieldNameBigInt]).toEqual(
							BigInt('0xfedcba9876543210')
						);
					} else {
						const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
						switch (fieldSize) {
							case 1:
								dataView.setUint8(
									actualDataOffset + offset,
									value
								);
								break;
							case 2:
								dataView.setUint16(
									actualDataOffset + offset,
									value,
									true
								);
								break;
							case 4:
								dataView.setUint32(
									actualDataOffset + offset,
									value,
									true
								);
								break;
						}
						const header = ImageOptionalHeader64.from(
							dummyData,
							dataOffset
						);
						expect(header[fieldName]).toEqual(value);
					}
				});
				it(`should write ${args[0]} field correctly`, () => {
					const dataView = new DataView(dummyData);
					const header = ImageOptionalHeader64.from(
						dummyData,
						dataOffset
					);
					const offset = getFieldOffset(FIELDS, fieldName);
					if (args[1] === 8) {
						header[fieldName] = Number.MAX_SAFE_INTEGER;
						expect(
							dataView.getUint32(actualDataOffset + offset, true)
						).toEqual(Number.MAX_SAFE_INTEGER % 0x100000000);
						expect(
							dataView.getUint32(
								actualDataOffset + offset + 4,
								true
							)
						).toEqual(
							Math.floor(Number.MAX_SAFE_INTEGER / 0x100000000)
						);

						// test bigint
						// TODO: remove 'as' on TS 4.3
						const fieldNameBigInt = `${args[0]}BigInt` as `${typeof args[0]}BigInt`;
						header[fieldNameBigInt] = BigInt('0xfedcba9876543210');
						expect(
							dataView.getUint32(actualDataOffset + offset, true)
						).toEqual(0x76543210);
						expect(
							dataView.getUint32(
								actualDataOffset + offset + 4,
								true
							)
						).toEqual(0xfedcba98);
					} else {
						const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
						header[fieldName] = value;
						switch (fieldSize) {
							case 1:
								expect(
									dataView.getUint8(actualDataOffset + offset)
								).toEqual(value);
								break;
							case 2:
								expect(
									dataView.getUint16(
										actualDataOffset + offset,
										true
									)
								).toEqual(value);
								break;
							case 4:
								expect(
									dataView.getUint32(
										actualDataOffset + offset,
										true
									)
								).toEqual(value);
								break;
						}
					}
				});
			});
		}
	);
});

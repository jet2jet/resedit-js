import ImageOptionalHeader from '@/format/ImageOptionalHeader';
import { getFieldOffset } from '../../util/structure';

// The definition:
//
// typedef struct _IMAGE_OPTIONAL_HEADER {
//   WORD                 Magic;
//   BYTE                 MajorLinkerVersion;
//   BYTE                 MinorLinkerVersion;
//   DWORD                SizeOfCode;
//   DWORD                SizeOfInitializedData;
//   DWORD                SizeOfUninitializedData;
//   DWORD                AddressOfEntryPoint;
//   DWORD                BaseOfCode;
//   DWORD                BaseOfData;
//   DWORD                ImageBase;
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
//   DWORD                SizeOfStackReserve;
//   DWORD                SizeOfStackCommit;
//   DWORD                SizeOfHeapReserve;
//   DWORD                SizeOfHeapCommit;
//   DWORD                LoaderFlags;
//   DWORD                NumberOfRvaAndSizes;
//   IMAGE_DATA_DIRECTORY DataDirectory[IMAGE_NUMBEROF_DIRECTORY_ENTRIES];
// } IMAGE_OPTIONAL_HEADER32, *PIMAGE_OPTIONAL_HEADER32;

const FIELDS = [
	['magic', 2],
	['majorLinkerVersion', 1],
	['minorLinkerVersion', 1],
	['sizeOfCode', 4],
	['sizeOfInitializedData', 4],
	['sizeOfUninitializedData', 4],
	['addressOfEntryPoint', 4],
	['baseOfCode', 4],
	['baseOfData', 4],
	['imageBase', 4],
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
	['sizeOfStackReserve', 4],
	['sizeOfStackCommit', 4],
	['sizeOfHeapReserve', 4],
	['sizeOfHeapCommit', 4],
	['loaderFlags', 4],
	['numberOfRvaAndSizes', 4],
] as const;

const TOTAL_DATA_SIZE = getFieldOffset(FIELDS, null);

describe('ImageOptionalHeader', () => {
	describe.each([undefined, 32] as const)(
		'Binary data offset is %s',
		(dataOffset) => {
			const actualDataOffset = dataOffset ?? 0;
			let dummyData: ArrayBuffer;
			beforeEach(() => {
				dummyData = new ArrayBuffer(TOTAL_DATA_SIZE + actualDataOffset);
			});
			it('should satisfy that ImageOptionalHeader.size is the total data size', () => {
				expect(ImageOptionalHeader.size).toEqual(TOTAL_DATA_SIZE);
			});
			it('should satisfy that ImageOptionalHeader.DEFAULT_MAGIC is 0x010b', () => {
				expect(ImageOptionalHeader.DEFAULT_MAGIC).toEqual(0x010b);
			});
			it.each(FIELDS)(
				'should read %s field correctly',
				(fieldName, fieldSize) => {
					const dataView = new DataView(dummyData);
					const offset = getFieldOffset(FIELDS, fieldName);
					const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
					switch (fieldSize) {
						case 1:
							dataView.setUint8(actualDataOffset + offset, value);
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
					const header = ImageOptionalHeader.from(
						dummyData,
						dataOffset
					);
					expect(header[fieldName]).toEqual(value);
				}
			);
			it.each(FIELDS)(
				'should write %s field correctly',
				(fieldName, fieldSize) => {
					const dataView = new DataView(dummyData);
					const header = ImageOptionalHeader.from(
						dummyData,
						dataOffset
					);
					const offset = getFieldOffset(FIELDS, fieldName);
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
			);
		}
	);
});

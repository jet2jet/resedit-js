import ImageFileHeader from '@/format/ImageFileHeader';
import { getFieldOffset } from '../../util/structure';

// The definition:
//
// typedef struct _IMAGE_FILE_HEADER {
//   WORD  Machine;
//   WORD  NumberOfSections;
//   DWORD TimeDateStamp;
//   DWORD PointerToSymbolTable;
//   DWORD NumberOfSymbols;
//   WORD  SizeOfOptionalHeader;
//   WORD  Characteristics;
// } IMAGE_FILE_HEADER, *PIMAGE_FILE_HEADER;

const FIELDS = [
	['machine', 2],
	['numberOfSections', 2],
	['timeDateStamp', 4],
	['pointerToSymbolTable', 4],
	['numberOfSymbols', 4],
	['sizeOfOptionalHeader', 2],
	['characteristics', 2],
] as const;

const TOTAL_DATA_SIZE = getFieldOffset(FIELDS, null);

describe('ImageFileHeader', () => {
	describe.each([undefined, 32] as const)(
		'Binary data offset is %s',
		(dataOffset) => {
			const actualDataOffset = dataOffset ?? 0;
			let dummyData: ArrayBuffer;
			beforeEach(() => {
				dummyData = new ArrayBuffer(TOTAL_DATA_SIZE + actualDataOffset);
			});
			it('should satisfy that ImageFileHeader.size is the total data size', () => {
				expect(ImageFileHeader.size).toEqual(TOTAL_DATA_SIZE);
			});
			FIELDS.forEach((args) => {
				const [fieldName, fieldSize] = args;
				it(`should read ${args[0]} field correctly`, () => {
					const dataView = new DataView(dummyData);
					const offset = getFieldOffset(FIELDS, fieldName);
					const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
					switch (fieldSize) {
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
					const header = ImageFileHeader.from(dummyData, dataOffset);
					expect(header[fieldName]).toEqual(value);
				});
				it(`should write ${args[0]} field correctly`, () => {
					const dataView = new DataView(dummyData);
					const header = ImageFileHeader.from(dummyData, dataOffset);
					const offset = getFieldOffset(FIELDS, fieldName);
					const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
					header[fieldName] = value;
					switch (fieldSize) {
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
				});
			});
		}
	);
});

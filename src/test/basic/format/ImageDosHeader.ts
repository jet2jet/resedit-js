import ImageDosHeader from '@/format/ImageDosHeader';
import { ExcludeNullField, getFieldOffset } from '../../util/structure';

const FIELDS = [
	['magic', 2],
	['lastPageSize', 2],
	['pages', 2],
	['relocations', 2],
	['headerSizeInParagraph', 2],
	['minAllocParagraphs', 2],
	['maxAllocParagraphs', 2],
	['initialSS', 2],
	['initialSP', 2],
	['checkSum', 2],
	['initialIP', 2],
	['initialCS', 2],
	['relocationTableAddress', 2],
	['overlayNum', 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	['oemId', 2],
	['oemInfo', 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	[null, 2],
	['newHeaderAddress', 4],
] as const;
const NON_RESERVED_FIELDS = FIELDS.filter(
	(f): f is ExcludeNullField<typeof f> => f[0] !== null
);

const TOTAL_DATA_SIZE = getFieldOffset(FIELDS, 'newHeaderAddress') + 4;

describe('ImageDosHeader', () => {
	describe.each([undefined, 32] as const)(
		'Binary data offset is %s',
		(dataOffset) => {
			const actualDataOffset = dataOffset ?? 0;
			let dummyData: ArrayBuffer;
			beforeEach(() => {
				dummyData = new ArrayBuffer(TOTAL_DATA_SIZE + actualDataOffset);
			});
			it('should satisfy that ImageDosHeader.size is the total data size', () => {
				expect(ImageDosHeader.size).toEqual(TOTAL_DATA_SIZE);
			});
			it('should satisfy that ImageDosHeader.DEFAULT_MAGIC is 0x5a4d', () => {
				expect(ImageDosHeader.DEFAULT_MAGIC).toEqual(0x5a4d);
			});
			it('should be valid if the magic is DEFAULT_MAGIC', () => {
				const dataView = new DataView(dummyData);
				dataView.setUint16(
					actualDataOffset,
					ImageDosHeader.DEFAULT_MAGIC,
					true
				);
				const header = ImageDosHeader.from(dummyData, dataOffset);
				expect(header.isValid()).toBeTruthy();
			});
			it('should be invalid if the magic is not DEFAULT_MAGIC', () => {
				const dataView = new DataView(dummyData);
				dataView.setUint16(actualDataOffset, 1, true);
				const header = ImageDosHeader.from(dummyData, dataOffset);
				expect(header.isValid()).toBeFalsy();
			});
			it.each(NON_RESERVED_FIELDS)(
				'should read %s field correctly',
				(fieldName, fieldSize) => {
					const dataView = new DataView(dummyData);
					const offset = getFieldOffset(FIELDS, fieldName);
					const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
					switch (fieldSize) {
						// case 1:
						// 	dataView.setUint8(actualDataOffset + offset, value);
						// 	break;
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
					const header = ImageDosHeader.from(dummyData, dataOffset);
					expect(header[fieldName]).toEqual(value);
				}
			);
			it.each(NON_RESERVED_FIELDS)(
				'should write %s field correctly',
				(fieldName, fieldSize) => {
					const dataView = new DataView(dummyData);
					const header = ImageDosHeader.from(dummyData, dataOffset);
					const offset = getFieldOffset(FIELDS, fieldName);
					const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
					header[fieldName] = value;
					switch (fieldSize) {
						// case 1:
						// 	expect(
						// 		dataView.getUint8(actualDataOffset + offset)
						// 	).toEqual(value);
						// 	break;
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

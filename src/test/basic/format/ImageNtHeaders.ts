import ImageNtHeaders from '@/format/ImageNtHeaders';
import { getFieldOffset } from '../../util/structure';

import ImageFileHeader from '@/format/ImageFileHeader';
import ImageOptionalHeader from '@/format/ImageOptionalHeader';
import ImageOptionalHeader64 from '@/format/ImageOptionalHeader64';
import ImageDataDirectoryArray from '@/format/ImageDataDirectoryArray';

const FIELDS = [['signature', 4]] as const;

const TOTAL_SIZE_32_BIT =
	4 +
	ImageFileHeader.size +
	ImageOptionalHeader.size +
	ImageDataDirectoryArray.size;
const TOTAL_SIZE_64_BIT =
	4 +
	ImageFileHeader.size +
	ImageOptionalHeader64.size +
	ImageDataDirectoryArray.size;

describe('ImageNtHeaders', () => {
	it('should satisfy that ImageNtHeaders.DEFAULT_SIGNATURE is 0x00004550', () => {
		expect(ImageNtHeaders.DEFAULT_SIGNATURE).toEqual(0x4550);
	});
	describe.each([true, false] as const)('is 32 bit: %s', (is32bit) => {
		describe.each([undefined, 32] as const)(
			'Binary data offset is %s',
			(dataOffset) => {
				const actualDataOffset = dataOffset ?? 0;
				let dummyData: ArrayBuffer;
				beforeEach(() => {
					dummyData = new ArrayBuffer(
						(is32bit ? TOTAL_SIZE_32_BIT : TOTAL_SIZE_64_BIT) +
							actualDataOffset
					);
					const dataView = new DataView(dummyData);
					dataView.setUint32(
						actualDataOffset,
						ImageNtHeaders.DEFAULT_SIGNATURE,
						true
					);
					dataView.setUint32(
						actualDataOffset + ImageFileHeader.size + 4,
						is32bit
							? ImageOptionalHeader.DEFAULT_MAGIC
							: ImageOptionalHeader64.DEFAULT_MAGIC,
						true
					);
				});
				it('should be valid if the magic is DEFAULT_SIGNATURE', () => {
					const dataView = new DataView(dummyData);
					dataView.setUint32(
						actualDataOffset,
						ImageNtHeaders.DEFAULT_SIGNATURE,
						true
					);
					const header = ImageNtHeaders.from(dummyData, dataOffset);
					expect(header.isValid()).toBeTruthy();
				});
				it('should be invalid if the magic is not DEFAULT_SIGNATURE (1)', () => {
					const dataView = new DataView(dummyData);
					dataView.setUint32(actualDataOffset, 1, true);
					const header = ImageNtHeaders.from(dummyData, dataOffset);
					expect(header.isValid()).toBeFalsy();
				});
				it('should be invalid if the magic is not DEFAULT_SIGNATURE (2)', () => {
					const dataView = new DataView(dummyData);
					dataView.setUint32(
						actualDataOffset,
						ImageNtHeaders.DEFAULT_SIGNATURE + 0x100000,
						true
					);
					const header = ImageNtHeaders.from(dummyData, dataOffset);
					expect(header.isValid()).toBeFalsy();
				});
				describe('is32bit()', () => {
					it(`should return ${is32bit.toString()} if optional header magic is set to ${
						is32bit ? 32 : 64
					} bit data`, () => {
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						expect(header.is32bit()).toEqual(is32bit);
					});
				});
				FIELDS.forEach((args) => {
					const [fieldName, fieldSize] = args;
					it(`should read ${args[0]} field correctly`, () => {
						const dataView = new DataView(dummyData);
						const offset = getFieldOffset(FIELDS, fieldName);
						const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
						switch (fieldSize) {
							case 4:
								dataView.setUint32(
									actualDataOffset + offset,
									value,
									true
								);
								break;
							default:
								throw new Error('Unexpected');
						}
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						expect(header[fieldName]).toEqual(value);
					});
					it(`should write ${args[0]} field correctly`, () => {
						const dataView = new DataView(dummyData);
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						const offset = getFieldOffset(FIELDS, fieldName);
						const value = 0x87654321 % Math.pow(2, 8 * fieldSize);
						header[fieldName] = value;
						switch (fieldSize) {
							case 4:
								expect(
									dataView.getUint32(
										actualDataOffset + offset,
										true
									)
								).toEqual(value);
								break;
							default:
								throw new Error('Unexpected');
						}
					});
				});
				describe('fileHeader', () => {
					it('should return new ImageFileHeader instance with appropriate binary', () => {
						const spied = jest.spyOn(ImageFileHeader, 'from');
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						const offset = 4;
						expect(header.fileHeader).toBeInstanceOf(
							ImageFileHeader
						);
						expect(spied).toHaveBeenCalledWith(
							dummyData,
							actualDataOffset + offset
						);
					});
				});
				describe('optionalHeader', () => {
					it(`should return new ${
						is32bit
							? 'ImageOptionalHeader'
							: 'ImageOptionalHeader64'
					} instance with appropriate binary`, () => {
						const spied = jest.spyOn(
							is32bit
								? ImageOptionalHeader
								: ImageOptionalHeader64,
							'from'
						);
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						const offset = ImageFileHeader.size + 4;
						expect(header.optionalHeader).toBeInstanceOf(
							is32bit
								? ImageOptionalHeader
								: ImageOptionalHeader64
						);
						expect(spied).toHaveBeenCalledWith(
							dummyData,
							actualDataOffset + offset
						);
					});
				});
				describe('optionalHeaderDataDirectory', () => {
					it("should return new ImageFileHeader instance with appropriate binary and getDataDirectoryOffset()'s offset value", () => {
						const spied = jest.spyOn(
							ImageDataDirectoryArray,
							'from'
						);
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						const offset =
							ImageFileHeader.size +
							4 +
							(is32bit
								? ImageOptionalHeader.size
								: ImageOptionalHeader64.size);
						expect(
							header.optionalHeaderDataDirectory
						).toBeInstanceOf(ImageDataDirectoryArray);
						expect(spied).toHaveBeenCalledWith(
							dummyData,
							actualDataOffset + offset
						);
					});
				});
				describe('getSectionHeaderOffset', () => {
					it('should return valid offset', () => {
						const expectedOffset =
							ImageFileHeader.size +
							4 +
							ImageDataDirectoryArray.size +
							(is32bit
								? ImageOptionalHeader.size
								: ImageOptionalHeader64.size);
						const header = ImageNtHeaders.from(
							dummyData,
							dataOffset
						);
						expect(header.getSectionHeaderOffset()).toEqual(
							expectedOffset
						);
					});
				});
			}
		);
	});
});

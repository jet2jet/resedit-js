import ImageDataDirectoryArray, {
	ImageDataDirectory,
} from '@/format/ImageDataDirectoryArray';

// The definition:
//
// typedef struct _IMAGE_DATA_DIRECTORY {
//   DWORD VirtualAddress;
//   DWORD Size;
// } IMAGE_DATA_DIRECTORY, *PIMAGE_DATA_DIRECTORY;

const ITEM_DATA_SIZE = 8;
const ITEM_COUNT = 16;
const TOTAL_DATA_SIZE = ITEM_DATA_SIZE * ITEM_COUNT;

const DUMMY_VIRTUAL_ADDRESS = 0x34560000;
const DUMMY_SIZE = 0x10000;
const DUMMY_VIRTUAL_ADDRESS_2 = 0x87654000;
const DUMMY_SIZE_2 = 0x1000;

describe('ImageDataDirectoryArray', () => {
	describe('const fields', () => {
		it(`should be size equal to ${TOTAL_DATA_SIZE}`, () => {
			expect(ImageDataDirectoryArray.size).toEqual(TOTAL_DATA_SIZE);
		});
		it(`should be itemSize equal to ${ITEM_DATA_SIZE}`, () => {
			expect(ImageDataDirectoryArray.itemSize).toEqual(ITEM_DATA_SIZE);
		});
		it(`should be length equal to ${ITEM_COUNT}`, () => {
			const dummyData = new ArrayBuffer(TOTAL_DATA_SIZE);
			const a = ImageDataDirectoryArray.from(dummyData, 0);
			expect(a.length).toEqual(ITEM_COUNT);
		});
	});
	describe.each([undefined, 32] as const)(
		'Binary data offset is %s',
		(dataOffset) => {
			const actualDataOffset = dataOffset ?? 0;
			let dummyData: ArrayBuffer;
			beforeEach(() => {
				dummyData = new ArrayBuffer(TOTAL_DATA_SIZE + actualDataOffset);
			});
			for (const index of [...Array(ITEM_COUNT)].map((_, i) => i)) {
				it(`should get valid item for index ${index}`, () => {
					const dataView = new DataView(dummyData);
					const dataArray = ImageDataDirectoryArray.from(
						dummyData,
						dataOffset
					);
					dataView.setUint32(
						index * ITEM_DATA_SIZE + actualDataOffset,
						DUMMY_VIRTUAL_ADDRESS,
						true
					);
					dataView.setUint32(
						index * ITEM_DATA_SIZE + 4 + actualDataOffset,
						DUMMY_SIZE,
						true
					);
					expect(dataArray.get(index)).toEqual<ImageDataDirectory>({
						virtualAddress: DUMMY_VIRTUAL_ADDRESS,
						size: DUMMY_SIZE,
					});
				});
				it(`should set valid item for index ${index}`, () => {
					const dataView = new DataView(dummyData);
					const dataArray = ImageDataDirectoryArray.from(
						dummyData,
						dataOffset
					);
					dataArray.set(index, {
						virtualAddress: DUMMY_VIRTUAL_ADDRESS,
						size: DUMMY_SIZE,
					});
					expect(
						dataView.getUint32(
							index * ITEM_DATA_SIZE + actualDataOffset,
							true
						)
					).toEqual(DUMMY_VIRTUAL_ADDRESS);
					expect(
						dataView.getUint32(
							index * ITEM_DATA_SIZE + 4 + actualDataOffset,
							true
						)
					).toEqual(DUMMY_SIZE);
				});
			}
			describe('findIndexByVirtualAddress()', () => {
				it('should return matched item if the address is found, or null if the address is not found', () => {
					const dataView = new DataView(dummyData);
					dataView.setUint32(
						0 + actualDataOffset,
						DUMMY_VIRTUAL_ADDRESS,
						true
					);
					dataView.setUint32(4 + actualDataOffset, DUMMY_SIZE, true);
					dataView.setUint32(
						8 + actualDataOffset,
						DUMMY_VIRTUAL_ADDRESS_2,
						true
					);
					dataView.setUint32(
						12 + actualDataOffset,
						DUMMY_SIZE_2,
						true
					);
					const dataArray = ImageDataDirectoryArray.from(
						dummyData,
						dataOffset
					);
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS
						)
					).toEqual(0);
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS + DUMMY_SIZE - 1
						)
					).toEqual(0);
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS - 1
						)
					).toBeNull();
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS + DUMMY_SIZE
						)
					).toBeNull();
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS_2
						)
					).toEqual(1);
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS_2 + DUMMY_SIZE_2 - 1
						)
					).toEqual(1);
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS_2 - 1
						)
					).toBeNull();
					expect(
						dataArray.findIndexByVirtualAddress(
							DUMMY_VIRTUAL_ADDRESS_2 + DUMMY_SIZE_2
						)
					).toBeNull();
				});
			});
		}
	);
});

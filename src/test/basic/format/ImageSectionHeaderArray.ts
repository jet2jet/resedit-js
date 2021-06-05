import { mocked } from 'ts-jest/utils';
import ImageSectionHeaderArray, {
	ImageSectionHeader,
} from '@/format/ImageSectionHeaderArray';
import { getFixedString, setFixedString } from '@/util/functions';

// The definition:
//
// #define IMAGE_SIZEOF_SHORT_NAME  8
// typedef struct _IMAGE_SECTION_HEADER {
//   BYTE  Name[IMAGE_SIZEOF_SHORT_NAME];
//   union {
//     DWORD PhysicalAddress;
//     DWORD VirtualSize;
//   } Misc;
//   DWORD VirtualAddress;
//   DWORD SizeOfRawData;
//   DWORD PointerToRawData;
//   DWORD PointerToRelocations;
//   DWORD PointerToLinenumbers;
//   WORD  NumberOfRelocations;
//   WORD  NumberOfLinenumbers;
//   DWORD Characteristics;
// } IMAGE_SECTION_HEADER, *PIMAGE_SECTION_HEADER;

const ITEM_DATA_SIZE = 40;

function writeSectionData(
	view: DataView,
	offset: number,
	section: ImageSectionHeader
) {
	view.setUint32(offset, 0);
	view.setUint32(offset, 4);
	new Uint8Array(view.buffer, view.byteOffset + offset, 8).set(
		Buffer.from(section.name, 'utf8').subarray(0, 8)
	);
	view.setUint32(offset + 8, section.virtualSize, true);
	view.setUint32(offset + 12, section.virtualAddress, true);
	view.setUint32(offset + 16, section.sizeOfRawData, true);
	view.setUint32(offset + 20, section.pointerToRawData, true);
	view.setUint32(offset + 24, section.pointerToRelocations, true);
	view.setUint32(offset + 28, section.pointerToLineNumbers, true);
	view.setUint16(offset + 32, section.numberOfRelocations, true);
	view.setUint16(offset + 34, section.numberOfLineNumbers, true);
	view.setUint32(offset + 36, section.characteristics, true);
}

function expectToMatchSectionData(
	view: DataView,
	offset: number,
	section: ImageSectionHeader
) {
	let nameLen = 0;
	for (; nameLen < 8; ++nameLen) {
		if (view.getUint8(offset + nameLen) === 0) {
			break;
		}
	}
	const name = Buffer.from(
		view.buffer,
		view.byteOffset + offset,
		nameLen
	).toString('utf8');
	expect(name).toEqual(section.name);

	expect(view.getUint32(offset + 8, true)).toEqual(section.virtualSize);
	expect(view.getUint32(offset + 12, true)).toEqual(section.virtualAddress);
	expect(view.getUint32(offset + 16, true)).toEqual(section.sizeOfRawData);
	expect(view.getUint32(offset + 20, true)).toEqual(section.pointerToRawData);
	expect(view.getUint32(offset + 24, true)).toEqual(
		section.pointerToRelocations
	);
	expect(view.getUint32(offset + 28, true)).toEqual(
		section.pointerToLineNumbers
	);
	expect(view.getUint16(offset + 32, true)).toEqual(
		section.numberOfRelocations
	);
	expect(view.getUint16(offset + 34, true)).toEqual(
		section.numberOfLineNumbers
	);
	expect(view.getUint32(offset + 36, true)).toEqual(section.characteristics);
}

const DUMMY_SECTION_HEADER1: ImageSectionHeader = {
	name: '.dummy1',
	virtualSize: 0x12345678,
	virtualAddress: 0x9abcdef0,
	sizeOfRawData: 0x23456789,
	pointerToRawData: 0xabcdef01,
	pointerToRelocations: 0x12345678,
	pointerToLineNumbers: 0x9abcdef0,
	numberOfRelocations: 0x4567,
	numberOfLineNumbers: 0x89ab,
	characteristics: 0xcdef0123,
};

const DUMMY_SECTION_HEADER2: ImageSectionHeader = {
	name: '.dummy2',
	virtualSize: 0x9abcdef0,
	virtualAddress: 0x23456789,
	sizeOfRawData: 0x12345678,
	pointerToRawData: 0xabcdef01,
	pointerToRelocations: 0x9abcdef0,
	pointerToLineNumbers: 0x01234567,
	numberOfRelocations: 0x1234,
	numberOfLineNumbers: 0x5678,
	characteristics: 0xfedcba98,
};

const DUMMY_SECTIONS = [DUMMY_SECTION_HEADER1, DUMMY_SECTION_HEADER2];

const TOTAL_DATA_SIZE = ITEM_DATA_SIZE * DUMMY_SECTIONS.length;

jest.mock('@/util/functions');

describe('ImageSectionHeaderArray', () => {
	beforeEach(() => {
		mocked(getFixedString).mockImplementation((view, offset, length) => {
			let actualLen = 0;
			for (let i = 0; i < length; ++i) {
				if (view.getUint8(offset + i) === 0) {
					break;
				}
				++actualLen;
			}
			return Buffer.from(
				view.buffer,
				view.byteOffset + offset,
				actualLen
			).toString('utf8');
		});
		mocked(setFixedString).mockImplementation(
			(view, offset, length, text) => {
				const u = new Uint8Array(
					view.buffer,
					view.byteOffset + offset,
					length
				);
				// fill by zero
				u.fill(0);
				u.set(Buffer.from(text, 'utf8').subarray(0, length));
			}
		);
	});
	describe('const fields', () => {
		it(`should be itemSize equal to ${ITEM_DATA_SIZE}`, () => {
			expect(ImageSectionHeaderArray.itemSize).toEqual(ITEM_DATA_SIZE);
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
			for (const [section, index] of DUMMY_SECTIONS.map(
				(section, i) => [section, i] as const
			)) {
				it(`should get valid item for index ${index}`, () => {
					const dataView = new DataView(dummyData);
					const dataArray = ImageSectionHeaderArray.from(
						dummyData,
						DUMMY_SECTIONS.length,
						dataOffset
					);
					writeSectionData(
						dataView,
						index * ITEM_DATA_SIZE + actualDataOffset,
						section
					);
					expect(dataArray.get(index)).toEqual(section);
					expect(getFixedString).toHaveBeenCalled();
				});
				it(`should set valid item for index ${index}`, () => {
					const dataView = new DataView(dummyData);
					const dataArray = ImageSectionHeaderArray.from(
						dummyData,
						DUMMY_SECTIONS.length,
						dataOffset
					);
					dataArray.set(index, section);
					expectToMatchSectionData(
						dataView,
						index * ITEM_DATA_SIZE + actualDataOffset,
						section
					);
					expect(setFixedString).toHaveBeenCalled();
				});
			}
		}
	);
});

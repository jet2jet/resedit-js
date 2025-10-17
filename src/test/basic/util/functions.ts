import { copyBuffer, createDataView } from '@/util/functions.js';

function generateArrayBuffer(pattern: number[]) {
	const bin = new ArrayBuffer(pattern.length);
	new Uint8Array(bin).set(new Uint8Array(pattern));
	return bin;
}

function generateDataView(pattern: number[]) {
	const paddingHead = 12;
	const paddingTail = 4;
	const bin = new ArrayBuffer(pattern.length + paddingHead + paddingTail);
	const view = new DataView(bin, paddingHead, pattern.length);
	pattern.forEach((val, i) => {
		view.setUint8(i, val);
	});
	return view;
}

function generateUint8Array(pattern: number[]) {
	return new Uint8Array(pattern);
}

function generateBuffer(pattern: number[]) {
	const paddingHead = 12;
	const paddingTail = 4;
	const bin = new ArrayBuffer(pattern.length + paddingHead + paddingTail);
	const buffer = Buffer.from(bin, paddingHead, pattern.length);
	buffer.set(new Uint8Array(pattern));
	return buffer;
}

type BufferPattern = [
	// fromDescription
	string,
	// generator
	(pattern: number[]) => ArrayBuffer | ArrayBufferView,
];
const bufferPatterns: BufferPattern[] = [
	['raw ArrayBuffer', generateArrayBuffer],
	['another DataView', generateDataView],
	['Uint8Array', generateUint8Array],
	['Node.js Buffer', generateBuffer],
];

describe('createDataView', () => {
	function performTestEntireRange(
		bin: ArrayBuffer | ArrayBufferView,
		pattern: number[]
	) {
		const view = createDataView(bin);
		pattern.forEach((val, i) => {
			expect(view.getUint8(i)).toBe(val);
		});
	}
	function performTestPartialRangeWithLength(
		bin: ArrayBuffer | ArrayBufferView,
		pattern: number[],
		partialLength: number
	) {
		const view = createDataView(bin, 0, partialLength);
		pattern.forEach((val, i) => {
			if (i >= partialLength) {
				expect(() => {
					view.getUint8(i);
				}).toThrow();
			} else {
				expect(view.getUint8(i)).toBe(val);
			}
		});
	}
	function performTestPartialRangeWithOffset(
		bin: ArrayBuffer | ArrayBufferView,
		pattern: number[],
		partialOffset: number
	) {
		const view = createDataView(bin, partialOffset);
		pattern.forEach((val, i) => {
			const viewOffset = i - partialOffset;
			if (viewOffset < 0) {
				return;
			}

			expect(view.getUint8(viewOffset)).toBe(val);
		});
	}
	function performTestPartialRangeWithLengthAndOffset(
		bin: ArrayBuffer | ArrayBufferView,
		pattern: number[],
		partialOffset: number,
		partialLength: number
	) {
		const view = createDataView(bin, partialOffset, partialLength);
		pattern.forEach((val, i) => {
			const viewOffset = i - partialOffset;
			if (viewOffset < 0) {
				return;
			}

			if (viewOffset >= partialLength) {
				expect(() => {
					view.getUint8(viewOffset);
				}).toThrow();
			} else {
				expect(view.getUint8(viewOffset)).toBe(val);
			}
		});
	}

	it.each(bufferPatterns)(
		'should create valid view from %s (entire range)',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

			const bin = generator(pattern);

			performTestEntireRange(bin, pattern);
		}
	);
	it.each(bufferPatterns)(
		'should create valid view from %s (partial data with length)',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const partialLength = 8;

			const bin = generator(pattern);

			performTestPartialRangeWithLength(bin, pattern, partialLength);
		}
	);
	it.each(bufferPatterns)(
		'should create valid view from %s (partial data with offset)',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const partialOffset = 4;

			const bin = generator(pattern);

			performTestPartialRangeWithOffset(bin, pattern, partialOffset);
		}
	);
	it.each(bufferPatterns)(
		'should create valid view from %s (partial data with offset and length)',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const partialOffset = 4;
			const partialLength = 8;

			const bin = generator(pattern);

			performTestPartialRangeWithLengthAndOffset(
				bin,
				pattern,
				partialOffset,
				partialLength
			);
		}
	);
});

describe('copyBuffer', () => {
	function performTest(
		dest: ArrayBuffer,
		destOffset: number,
		bin: ArrayBuffer | ArrayBufferView,
		pattern: number[],
		offset: number,
		length: number
	) {
		const destView = new DataView(dest, destOffset);
		copyBuffer(dest, destOffset, bin, offset, length);
		pattern.slice(offset, offset + length).forEach((val, i) => {
			expect(destView.getUint8(i)).toBe(val);
		});
	}

	it.each(bufferPatterns)(
		'should copy entire data to first position from %s',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const unchangedData = 0xdeadbeef;
			const destOffset = 0;
			const unchangedDataOffset = pattern.length;

			const dest = new ArrayBuffer(pattern.length + 4);
			const destView = new DataView(dest);
			destView.setUint32(unchangedDataOffset, unchangedData, true);
			const bin = generator(pattern);

			performTest(dest, destOffset, bin, pattern, 0, pattern.length);

			expect(destView.getUint32(unchangedDataOffset, true)).toBe(
				unchangedData
			);
		}
	);
	it.each(bufferPatterns)(
		'should copy entire data to non-first position from %s',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const unchangedData = 0xdeadbeef;
			const destOffset = 4;
			const unchangedDataOffset = 0;

			const dest = new ArrayBuffer(pattern.length + 4);
			const destView = new DataView(dest);
			destView.setUint32(unchangedDataOffset, unchangedData, true);
			const bin = generator(pattern);

			performTest(dest, destOffset, bin, pattern, 0, pattern.length);

			expect(destView.getUint32(unchangedDataOffset, true)).toBe(
				unchangedData
			);
		}
	);
	it.each(bufferPatterns)(
		'should copy partial data to first position from %s',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const unchangedData = 0xdeadbeef;
			const destOffset = 0;
			const unchangedDataOffset1 = pattern.length - 8;
			const unchangedDataOffset2 = pattern.length - 4;

			const dest = new ArrayBuffer(pattern.length);
			const destView = new DataView(dest);
			destView.setUint32(unchangedDataOffset1, unchangedData, true);
			destView.setUint32(unchangedDataOffset2, unchangedData, true);
			const bin = generator(pattern);

			performTest(dest, destOffset, bin, pattern, 2, pattern.length - 8);

			expect(destView.getUint32(unchangedDataOffset1, true)).toBe(
				unchangedData
			);
			expect(destView.getUint32(unchangedDataOffset2, true)).toBe(
				unchangedData
			);
		}
	);
	it.each(bufferPatterns)(
		'should copy partial data to non-first position from %s',
		(_, generator) => {
			// prettier-ignore
			const pattern: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			const unchangedData = 0xdeadbeef;
			const destOffset = 4;
			const unchangedDataOffset1 = 0;
			const unchangedDataOffset2 = pattern.length - 4;

			const dest = new ArrayBuffer(pattern.length);
			const destView = new DataView(dest);
			destView.setUint32(unchangedDataOffset1, unchangedData, true);
			destView.setUint32(unchangedDataOffset2, unchangedData, true);
			const bin = generator(pattern);

			performTest(dest, destOffset, bin, pattern, 2, pattern.length - 8);

			expect(destView.getUint32(unchangedDataOffset1, true)).toBe(
				unchangedData
			);
			expect(destView.getUint32(unchangedDataOffset2, true)).toBe(
				unchangedData
			);
		}
	);
});

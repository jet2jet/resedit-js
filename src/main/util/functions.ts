import ImageDosHeader from '../format/ImageDosHeader';

// We must use 'object' for this function (Record<string, unknown> is not usable here)
/* eslint-disable @typescript-eslint/ban-types */
export function cloneObject<T extends object>(object: Readonly<T>): T;
export function cloneObject<T extends object>(object: T): T;

export function cloneObject<T extends object>(object: object): T {
	const r: any = {};
	Object.keys(object).forEach((key) => {
		r[key] = object[key as keyof typeof object];
	});
	return r;
}
/* eslint-enable @typescript-eslint/ban-types */

export function createDataView(
	bin: ArrayBuffer | ArrayBufferView,
	byteOffset?: number,
	byteLength?: number
): DataView {
	if ('buffer' in bin) {
		let newOffset = bin.byteOffset;
		let newLength = bin.byteLength;
		if (typeof byteOffset !== 'undefined') {
			newOffset += byteOffset;
			newLength -= byteOffset;
		}
		if (typeof byteLength !== 'undefined') {
			newLength = byteLength;
		}
		return new DataView(bin.buffer, newOffset, newLength);
	} else {
		return new DataView(bin, byteOffset, byteLength);
	}
}

export function calculateCheckSumForPE(
	bin: ArrayBuffer,
	storeToBinary?: boolean
): number {
	const dosHeader = ImageDosHeader.from(bin);
	const view = new DataView(bin);

	const checkSumOffset = dosHeader.newHeaderAddress + 88;

	let result = 0;
	const limit = 0x100000000; // 2^32
	const update = (dword: number) => {
		result += dword;
		if (result >= limit) {
			result = (result % limit) + ((result / limit) | 0);
		}
	};

	const len = view.byteLength;
	const lenExtra = len % 4;
	const lenAlign = len - lenExtra;
	for (let i = 0; i < lenAlign; i += 4) {
		if (i !== checkSumOffset) {
			update(view.getUint32(i, true));
		}
	}
	if (lenExtra !== 0) {
		let extra = 0;
		for (let i = 0; i < lenExtra; i++) {
			extra |= view.getUint8(lenAlign + i) << ((3 - i) * 8);
		}
		update(extra);
	}
	result = (result & 0xffff) + (result >>> 16);
	result += result >>> 16;
	result = (result & 0xffff) + len;

	if (storeToBinary) {
		view.setUint32(checkSumOffset, result, true);
	}
	return result;
}

export function roundUp(val: number, align: number): number {
	return Math.floor((val + align - 1) / align) * align;
}

export function copyBuffer(
	dest: ArrayBuffer | ArrayBufferView,
	destOffset: number,
	src: ArrayBuffer | ArrayBufferView,
	srcOffset: number,
	length: number
): void {
	const ua8Dest =
		'buffer' in dest
			? new Uint8Array(
					dest.buffer,
					dest.byteOffset + (destOffset || 0),
					length
			  )
			: new Uint8Array(dest, destOffset, length);
	const ua8Src =
		'buffer' in src
			? new Uint8Array(
					src.buffer,
					src.byteOffset + (srcOffset || 0),
					length
			  )
			: new Uint8Array(src, srcOffset, length);

	ua8Dest.set(ua8Src);
}

export function allocatePartialBinary(
	binBase: ArrayBuffer | ArrayBufferView,
	offset: number,
	length: number
): ArrayBuffer {
	const b = new ArrayBuffer(length);
	copyBuffer(b, 0, binBase, offset, length);
	return b;
}

export function cloneToArrayBuffer(
	binBase: ArrayBuffer | ArrayBufferView
): ArrayBuffer {
	if ('buffer' in binBase) {
		const b = new ArrayBuffer(binBase.byteLength);
		new Uint8Array(b).set(
			new Uint8Array(
				binBase.buffer,
				binBase.byteOffset,
				binBase.byteLength
			)
		);
		return b;
	} else {
		const b = new ArrayBuffer(binBase.byteLength);
		new Uint8Array(b).set(new Uint8Array(binBase));
		return b;
	}
}

export function readInt32WithLastOffset(
	view: DataView,
	offset: number,
	last: number
): number {
	return offset + 4 <= last ? view.getInt32(offset, true) : 0;
}

export function readUint8WithLastOffset(
	view: DataView,
	offset: number,
	last: number
): number {
	return offset < last ? view.getUint8(offset) : 0;
}

export function readUint16WithLastOffset(
	view: DataView,
	offset: number,
	last: number
): number {
	return offset + 2 <= last ? view.getUint16(offset, true) : 0;
}

export function readUint32WithLastOffset(
	view: DataView,
	offset: number,
	last: number
): number {
	return offset + 4 <= last ? view.getUint32(offset, true) : 0;
}

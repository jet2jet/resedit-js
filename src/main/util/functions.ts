
import ImageDosHeader from '../format/ImageDosHeader';

export function cloneObject<T extends object>(object: Readonly<T>): T;
export function cloneObject<T extends object>(object: T): T;

export function cloneObject<T extends object>(object: any): T {
	const r: any = {};
	Object.keys(object).forEach((key) => {
		r[key] = object[key as keyof T];
	});
	return r;
}

export function calculateCheckSumForPE(bin: ArrayBuffer, storeToBinary?: boolean): number {
	const dosHeader = ImageDosHeader.from(bin)
	const view = new DataView(bin);

	const checkSumOffset = dosHeader.newHeaderAddress + 88;

	// Currently this function does not calculate check-sum, and does return '0' instead.
	const result = 0;

	if (storeToBinary) {
		view.setUint32(checkSumOffset, result, true);
	}
	return result;
}

export function roundUp(val: number, align: number): number {
	return Math.floor((val + align - 1) / align) * align;
}

export function copyBuffer(dest: ArrayBuffer, destOffset: number, src: ArrayBuffer, srcOffset: number, length: number) {
	new Uint8Array(dest, destOffset, length).set(
		new Uint8Array(src, srcOffset, length)
	);
}

export function allocatePartialBinary(binBase: ArrayBuffer, offset: number, length: number): ArrayBuffer {
	const b = new ArrayBuffer(length);
	copyBuffer(b, 0, binBase, offset, length);
	return b;
}

export function readInt32WithLastOffset(view: DataView, offset: number, last: number): number {
	return offset + 4 <= last ? view.getInt32(offset, true) : 0;
}

export function readUint8WithLastOffset(view: DataView, offset: number, last: number): number {
	return offset < last ? view.getUint8(offset) : 0;
}

export function readUint16WithLastOffset(view: DataView, offset: number, last: number): number {
	return offset + 2 <= last ? view.getUint16(offset, true) : 0;
}

export function readUint32WithLastOffset(view: DataView, offset: number, last: number): number {
	return offset + 4 <= last ? view.getUint32(offset, true) : 0;
}

/// <reference types='node' />

import ArrayFormatBase from './ArrayFormatBase';

export interface ImageSectionHeader {
	name: string;
	virtualSize: number;
	virtualAddress: number;
	sizeOfRawData: number;
	pointerToRawData: number;
	pointerToRelocations: number;
	pointerToLineNumbers: number;
	numberOfRelocations: number;
	numberOfLineNumbers: number;
	characteristics: number;
}

function getFixedString(
	view: DataView,
	offset: number,
	length: number
): string {
	let actualLen = 0;
	for (let i = 0; i < length; ++i) {
		if (view.getUint8(offset + i) === 0) {
			break;
		}
		++actualLen;
	}
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(
			view.buffer,
			view.byteOffset + offset,
			actualLen
		).toString('utf8');
	} else if (typeof decodeURIComponent !== 'undefined') {
		let s = '';
		for (let i = 0; i < actualLen; ++i) {
			const c = view.getUint8(offset + i);
			if (c < 16) {
				s += '%0' + c.toString(16);
			} else {
				s += '%' + c.toString(16);
			}
		}
		return decodeURIComponent(s);
	} else {
		let s = '';
		for (let i = 0; i < actualLen; ++i) {
			const c = view.getUint8(offset + i);
			s += String.fromCharCode(c);
		}
		return s;
	}
}

function setFixedString(
	view: DataView,
	offset: number,
	length: number,
	text: string
) {
	if (typeof Buffer !== 'undefined') {
		const u = new Uint8Array(view.buffer, view.byteOffset + offset, length);
		// fill by zero
		u.set(new Uint8Array(length));
		u.set(Buffer.from(text, 'utf8').subarray(0, length));
	} else if (typeof encodeURIComponent !== 'undefined') {
		const s = encodeURIComponent(text);
		for (let i = 0, j = 0; i < length; ++i) {
			if (j >= s.length) {
				view.setUint8(i + offset, 0);
			} else {
				const c = s.charCodeAt(j);
				if (c === 37) {
					// '%'
					const n = parseInt(s.substr(j + 1, 2), 16);
					if (typeof n === 'number' && !isNaN(n)) {
						view.setUint8(i + offset, n);
					} else {
						view.setUint8(i + offset, 0);
					}
					j += 3;
				} else {
					view.setUint8(i + offset, c);
				}
			}
		}
	} else {
		for (let i = 0, j = 0; i < length; ++i) {
			if (j >= text.length) {
				view.setUint8(i + offset, 0);
			} else {
				const c = text.charCodeAt(j);
				view.setUint8(i + offset, c & 0xff);
			}
		}
	}
}

export default class ImageSectionHeaderArray extends ArrayFormatBase<ImageSectionHeader> {
	public static readonly itemSize = 40;

	private constructor(view: DataView, public readonly length: number) {
		super(view);
	}

	public static from(
		bin: ArrayBuffer,
		length: number,
		offset = 0
	): ImageSectionHeaderArray {
		const size = length * 40;
		return new ImageSectionHeaderArray(
			new DataView(bin, offset, size),
			length
		);
	}

	public get(index: number): Readonly<ImageSectionHeader> {
		return {
			name: getFixedString(this.view, index * 40, 8),
			virtualSize: this.view.getUint32(8 + index * 40, true),
			virtualAddress: this.view.getUint32(12 + index * 40, true),
			sizeOfRawData: this.view.getUint32(16 + index * 40, true),
			pointerToRawData: this.view.getUint32(20 + index * 40, true),
			pointerToRelocations: this.view.getUint32(24 + index * 40, true),
			pointerToLineNumbers: this.view.getUint32(28 + index * 40, true),
			numberOfRelocations: this.view.getUint16(32 + index * 40, true),
			numberOfLineNumbers: this.view.getUint16(34 + index * 40, true),
			characteristics: this.view.getUint32(36 + index * 40, true),
		};
	}
	public set(index: number, data: ImageSectionHeader): void {
		setFixedString(this.view, index * 40, 8, data.name);
		this.view.setUint32(8 + index * 40, data.virtualSize, true);
		this.view.setUint32(12 + index * 40, data.virtualAddress, true);
		this.view.setUint32(16 + index * 40, data.sizeOfRawData, true);
		this.view.setUint32(20 + index * 40, data.pointerToRawData, true);
		this.view.setUint32(24 + index * 40, data.pointerToRelocations, true);
		this.view.setUint32(28 + index * 40, data.pointerToLineNumbers, true);
		this.view.setUint16(32 + index * 40, data.numberOfRelocations, true);
		this.view.setUint16(34 + index * 40, data.numberOfLineNumbers, true);
		this.view.setUint32(36 + index * 40, data.characteristics, true);
	}
}

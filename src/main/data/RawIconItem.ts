import { allocatePartialBinary } from '../util/functions.js';

/**
 * Represents the raw-graphic icon item, such as PNG data.
 */
export default class RawIconItem {
	public bin: ArrayBuffer;

	constructor(
		bin: ArrayBuffer | ArrayBufferView,
		public width: number,
		public height: number,
		public bitCount: number,
		byteOffset?: number,
		byteLength?: number
	) {
		if (typeof byteOffset !== 'number') {
			byteOffset = 0;
			byteLength = bin.byteLength;
		} else if (typeof byteLength !== 'number') {
			byteLength = bin.byteLength - byteOffset;
		}
		this.bin = allocatePartialBinary(bin, byteOffset, byteLength);
	}

	public static from(
		bin: ArrayBuffer | ArrayBufferView,
		width: number,
		height: number,
		bitCount: number,
		byteOffset?: number,
		byteLength?: number
	): RawIconItem {
		return new RawIconItem(
			bin,
			width,
			height,
			bitCount,
			byteOffset,
			byteLength
		);
	}

	public isIcon(): false {
		return false;
	}
	public isRaw(): this is RawIconItem {
		return true;
	}
}

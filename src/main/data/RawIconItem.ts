
/**
 * Represents the raw-graphic icon item, such as PNG data.
 */
export default class RawIconItem {

	constructor(
		public bin: ArrayBuffer,
		public width: number,
		public height: number,
		public bitCount: number
	) { }

	public static from(bin: ArrayBuffer, width: number, height: number, bitCount: number) {
		return new RawIconItem(bin, width, height, bitCount);
	}

	public isIcon(): false {
		return false;
	}
	public isRaw(): this is RawIconItem {
		return true;
	}
}

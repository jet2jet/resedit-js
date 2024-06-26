// StringTable entry:
//   16-times of {<WORD length> [<UTF-16 string>]}

export default class StringTableItem {
	public readonly length = 16;
	private _a: string[];

	constructor() {
		this._a = [];
		this._a.length = 16;
		for (let i = 0; i < 16; ++i) {
			this._a[i] = '';
		}
	}

	public static fromEntry(
		bin: ArrayBuffer,
		offset: number,
		byteLength: number
	): StringTableItem {
		const view = new DataView(bin, offset, byteLength);
		const ret = new StringTableItem();
		let o = 0;
		for (let i = 0; i < 16; ++i) {
			const len = view.getUint16(o, true);
			o += 2;
			let s = '';
			for (let j = 0; j < len; ++j) {
				s += String.fromCharCode(view.getUint16(o, true));
				o += 2;
			}
			ret._a[i] = s;
		}
		return ret;
	}

	public get(index: number): string | null {
		const value = this._a[index];
		return value != null && value !== '' ? value : null;
	}
	public getAll(): Array<string | null> {
		return this._a.map((s) => s || null);
	}
	public set(index: number, val: string | null): void {
		this._a[index] = `${val ?? ''}`.substr(0, 4097); // length must be no longer than 4097
	}
	public calcByteLength(): number {
		let len = 0;
		for (let i = 0; i < 16; ++i) {
			const item = this._a[i];
			len += 2;
			if (item != null) {
				len += 2 * item.length; // UTF-16 length
			}
		}
		// 16 alignment
		return Math.floor((len + 15) / 16) * 16;
	}
	public generate(bin: ArrayBuffer, offset: number): number {
		const out = new DataView(bin, offset);
		let len = 0;
		for (let i = 0; i < 16; ++i) {
			const s = this._a[i];
			const l = s == null ? 0 : s.length > 4097 ? 4097 : s.length;
			out.setUint16(len, l, true);
			len += 2;
			if (s != null) {
				for (let j = 0; j < l; ++j) {
					// output as UTF-16
					out.setUint16(len, s.charCodeAt(j), true);
					len += 2;
				}
			}
		}
		// 16 alignment
		return Math.floor((len + 15) / 16) * 16;
	}
}

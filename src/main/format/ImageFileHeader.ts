import FormatBase from './FormatBase';

export default class ImageFileHeader extends FormatBase {
	public static readonly size = 20;

	private constructor(view: DataView) {
		super(view);
	}

	public static from(bin: ArrayBuffer, offset = 0): ImageFileHeader {
		return new ImageFileHeader(new DataView(bin, offset, 20));
	}

	public get machine(): number {
		return this.view.getUint16(0, true);
	}
	public set machine(val: number) {
		this.view.setUint16(0, val, true);
	}
	public get numberOfSections(): number {
		return this.view.getUint16(2, true);
	}
	public set numberOfSections(val: number) {
		this.view.setUint16(2, val, true);
	}
	public get timeDateStamp(): number {
		return this.view.getUint32(4, true);
	}
	public set timeDateStamp(val: number) {
		this.view.setUint32(4, val, true);
	}
	public get pointerToSymbolTable(): number {
		return this.view.getUint32(8, true);
	}
	public set pointerToSymbolTable(val: number) {
		this.view.setUint32(8, val, true);
	}
	public get numberOfSymbols(): number {
		return this.view.getUint32(12, true);
	}
	public set numberOfSymbols(val: number) {
		this.view.setUint32(12, val, true);
	}
	public get sizeOfOptionalHeader(): number {
		return this.view.getUint16(16, true);
	}
	public set sizeOfOptionalHeader(val: number) {
		this.view.setUint16(16, val, true);
	}
	public get characteristics(): number {
		return this.view.getUint16(18, true);
	}
	public set characteristics(val: number) {
		this.view.setUint16(18, val, true);
	}
}

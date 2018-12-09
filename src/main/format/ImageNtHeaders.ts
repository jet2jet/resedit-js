
import FormatBase from './FormatBase';
import ImageFileHeader from './ImageFileHeader';
import ImageOptionalHeader from './ImageOptionalHeader';
import ImageOptionalHeader64 from './ImageOptionalHeader64';
import ImageDataDirectoryArray from './ImageDataDirectoryArray';

export default class ImageNtHeaders extends FormatBase {
	private constructor(view: DataView) {
		super(view);
	}

	public static from(bin: ArrayBuffer, offset = 0) {
		const magic = (new DataView(bin, offset + ImageFileHeader.size, 6)).getUint16(4, true);
		let len = 4 + ImageFileHeader.size + ImageDataDirectoryArray.size;
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			len += ImageOptionalHeader64.size;
		} else {
			len += ImageOptionalHeader.size;
		}
		return new ImageNtHeaders(new DataView(bin, offset, len));
	}
	public static readonly DEFAULT_SIGNATURE = 0x4550; // 'PE\x00\x00'

	public isValid() {
		return this.signature === ImageNtHeaders.DEFAULT_SIGNATURE;
	}

	public get signature() { return this.view.getUint32(0, true); }
	public set signature(val: number) { this.view.setUint32(0, val, true); }
	public get fileHeader() {
		return ImageFileHeader.from(this.view.buffer, this.view.byteOffset + 4);
	}
	public get optionalHeader() {
		const off = ImageFileHeader.size + 4;
		const magic = this.view.getUint16(off, true);
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			return ImageOptionalHeader64.from(this.view.buffer, this.view.byteOffset + off);
		} else {
			return ImageOptionalHeader.from(this.view.buffer, this.view.byteOffset + off);
		}
	}
	public get optionalHeaderDataDirectory() {
		let off = ImageFileHeader.size + 4;
		const magic = this.view.getUint16(off, true);
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			off += ImageOptionalHeader64.size;
		} else {
			off += ImageOptionalHeader.size;
		}
		return ImageDataDirectoryArray.from(this.view.buffer, this.view.byteOffset + off);
	}
	public getSectionHeaderOffset() {
		let off = ImageFileHeader.size + 4;
		const magic = this.view.getUint16(off, true);
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			off += ImageOptionalHeader64.size;
		} else {
			off += ImageOptionalHeader.size;
		}
		return off + ImageDataDirectoryArray.size;
	}
}

import FormatBase from './FormatBase';
import ImageFileHeader from './ImageFileHeader';
import ImageOptionalHeader from './ImageOptionalHeader';
import ImageOptionalHeader64 from './ImageOptionalHeader64';
import ImageDataDirectoryArray from './ImageDataDirectoryArray';
import { createDataView } from '../util/functions';

export default class ImageNtHeaders extends FormatBase {
	public static readonly DEFAULT_SIGNATURE = 0x4550; // 'PE\x00\x00'

	private constructor(view: DataView) {
		super(view);
	}

	public static from(
		bin: ArrayBuffer | ArrayBufferView,
		offset = 0
	): ImageNtHeaders {
		const magic = createDataView(
			bin,
			offset + ImageFileHeader.size,
			6
		).getUint16(4, true);
		let len = 4 + ImageFileHeader.size + ImageDataDirectoryArray.size;
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			len += ImageOptionalHeader64.size;
		} else {
			len += ImageOptionalHeader.size;
		}
		return new ImageNtHeaders(createDataView(bin, offset, len));
	}

	public isValid(): boolean {
		return this.signature === ImageNtHeaders.DEFAULT_SIGNATURE;
	}
	public is32bit(): boolean {
		return (
			this.view.getUint16(ImageFileHeader.size + 4, true) ===
			ImageOptionalHeader.DEFAULT_MAGIC
		);
	}

	public get signature(): number {
		return this.view.getUint32(0, true);
	}
	public set signature(val: number) {
		this.view.setUint32(0, val, true);
	}
	public get fileHeader(): ImageFileHeader {
		return ImageFileHeader.from(this.view.buffer, this.view.byteOffset + 4);
	}
	public get optionalHeader(): ImageOptionalHeader | ImageOptionalHeader64 {
		const off = ImageFileHeader.size + 4;
		const magic = this.view.getUint16(off, true);
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			return ImageOptionalHeader64.from(
				this.view.buffer,
				this.view.byteOffset + off
			);
		} else {
			return ImageOptionalHeader.from(
				this.view.buffer,
				this.view.byteOffset + off
			);
		}
	}
	public get optionalHeaderDataDirectory(): ImageDataDirectoryArray {
		return ImageDataDirectoryArray.from(
			this.view.buffer,
			this.view.byteOffset + this.getDataDirectoryOffset()
		);
	}
	// @internal
	public getDataDirectoryOffset(): number {
		let off = ImageFileHeader.size + 4;
		const magic = this.view.getUint16(off, true);
		if (magic === ImageOptionalHeader64.DEFAULT_MAGIC) {
			off += ImageOptionalHeader64.size;
		} else {
			off += ImageOptionalHeader.size;
		}
		return off;
	}
	public getSectionHeaderOffset(): number {
		return this.getDataDirectoryOffset() + ImageDataDirectoryArray.size;
	}
}

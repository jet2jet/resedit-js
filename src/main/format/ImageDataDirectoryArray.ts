import ArrayFormatBase from './ArrayFormatBase';

export interface ImageDataDirectory {
	virtualAddress: number;
	size: number;
}

export default class ImageDataDirectoryArray extends ArrayFormatBase<ImageDataDirectory> {
	public static readonly size = 128; // 16 * 8
	public static readonly itemSize = 8;

	public readonly length = 16;

	private constructor(view: DataView) {
		super(view);
	}

	/** @note This does not clone binary data; the changes to the array will modify the specified buffer `bin` */
	public static from(bin: ArrayBuffer, offset = 0): ImageDataDirectoryArray {
		return new ImageDataDirectoryArray(new DataView(bin, offset, 128));
	}

	public get(index: number): Readonly<ImageDataDirectory> {
		return {
			virtualAddress: this.view.getUint32(index * 8, true),
			size: this.view.getUint32(4 + index * 8, true),
		};
	}
	public set(index: number, data: ImageDataDirectory): void {
		this.view.setUint32(index * 8, data.virtualAddress, true);
		this.view.setUint32(4 + index * 8, data.size, true);
	}
	public findIndexByVirtualAddress(virtualAddress: number): number | null {
		for (let i = 0; i < 16; ++i) {
			const va = this.view.getUint32(i * 8, true);
			const vs = this.view.getUint32(4 + i * 8, true);
			if (virtualAddress >= va && virtualAddress < va + vs) {
				return i;
			}
		}
		return null;
	}
}

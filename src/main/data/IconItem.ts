import BitmapInfo from './BitmapInfo.js';

import {
	allocatePartialBinary,
	copyBuffer,
	createDataView,
	readInt32WithLastOffset,
	readUint8WithLastOffset,
	readUint16WithLastOffset,
	readUint32WithLastOffset,
	roundUp,
} from '../util/functions.js';

function calcMaskSize(width: number, height: number) {
	// round up to 4 bytes (32 bit)
	// (mask pixels is 1-bit bitmap)
	const actualWidthBytes = roundUp(Math.abs(width), 32) / 8;
	return actualWidthBytes * Math.abs(height);
}

export default class IconItem {
	/**
	 * Bitmap header data (`BITMAPINFOHEADER`)
	 */
	public readonly bitmapInfo: BitmapInfo;
	/**
	 * Horizontal size of the icon in pixel (overrides `bitmapInfo.width`).
	 * If `null` is specified, `bitmapInfo.width` will be used.
	 */
	public width: number | null;
	/**
	 * Vertical size of the icon in pixel (overrides `bitmapInfo.height`).
	 * If `null` is specified, `bitmapInfo.height` will be used.
	 */
	public height: number | null;
	/**
	 * Bitmap pixel data used for mask
	 * (the data will be appended immediately after `pixels` when generating icon binary)
	 */
	public masks: ArrayBuffer;
	/**
	 * Bitmap pixel data
	 */
	private _pixels: ArrayBuffer;

	private constructor(
		width: number | null,
		height: number | null,
		bin: ArrayBuffer | ArrayBufferView,
		byteOffset?: number,
		byteLength?: number
	) {
		const view = createDataView(bin, byteOffset, byteLength);
		const totalSize = view.byteLength;

		let headerSize = view.getUint32(0, true);
		if (headerSize > totalSize) {
			headerSize = totalSize;
		}
		const sizeImage = readUint32WithLastOffset(view, 20, headerSize);
		const bi: BitmapInfo = {
			width: readInt32WithLastOffset(view, 4, headerSize),
			height: readInt32WithLastOffset(view, 8, headerSize),
			planes: readUint16WithLastOffset(view, 12, headerSize),
			bitCount: readUint16WithLastOffset(view, 14, headerSize),
			compression: readUint32WithLastOffset(view, 16, headerSize),
			sizeImage,
			xPelsPerMeter: readInt32WithLastOffset(view, 24, headerSize),
			yPelsPerMeter: readInt32WithLastOffset(view, 28, headerSize),
			colorUsed: readUint32WithLastOffset(view, 32, headerSize),
			colorImportant: readUint32WithLastOffset(view, 36, headerSize),
			colors: [],
		};
		let offset = 40;
		let colors = bi.colorUsed;
		if (!colors) {
			switch (bi.bitCount) {
				case 1:
					colors = 2;
					break;
				case 4:
					colors = 16;
					break;
				case 8:
					colors = 256;
					break;
			}
		}
		for (let i = 0; i < colors; ++i) {
			bi.colors.push({
				b: readUint8WithLastOffset(view, offset, totalSize),
				g: readUint8WithLastOffset(view, offset + 1, totalSize),
				r: readUint8WithLastOffset(view, offset + 2, totalSize),
			});
			offset += 4;
		}

		this.width = width;
		this.height = height;
		this.bitmapInfo = bi;
		// round up to 4 bytes (32 bit)
		const widthBytes = roundUp(bi.bitCount * Math.abs(bi.width), 32) / 8;
		const absActualHeight = Math.abs(bi.height) / 2;
		// sizeImage may be weird if compression is 0 (BI_RGB), so
		// we calculate actual bitmap size from width and height
		const size =
			bi.compression !== 0 && sizeImage !== 0
				? sizeImage
				: widthBytes * absActualHeight;
		if (size + offset > totalSize) {
			throw new Error(
				`Unexpected bitmap data in icon: bitmap size ${size} is larger than ${totalSize} - ${offset}`
			);
		}
		this._pixels = allocatePartialBinary(view, offset, size);
		offset += size;
		const maskSize = calcMaskSize(bi.width, absActualHeight);
		if (maskSize + offset <= totalSize) {
			this.masks = allocatePartialBinary(view, offset, maskSize);
		} else {
			// create a zero buffer (no mask is not allowed)
			this.masks = new ArrayBuffer(maskSize);
		}
	}
	/**
	 * Bitmap pixel data.
	 * @note
	 * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
	 */
	public get pixels(): ArrayBuffer {
		return this._pixels;
	}
	/**
	 * Bitmap pixel data.
	 * @note
	 * On set, if `bitmapInfo.sizeImage` is non-zero, `bitmapInfo.sizeImage` will be updated.
	 */
	public set pixels(newValue: ArrayBuffer) {
		this._pixels = newValue;
		if (this.bitmapInfo.sizeImage !== 0) {
			this.bitmapInfo.sizeImage = newValue.byteLength;
		}
	}
	/**
	 * Generates `IconItem` instance from bitmap data binary.
	 * @param bin binary data containing the bitmap data
	 * @param byteOffset byte offset of `bin` referring the bitmap data
	 * @param byteLength available byte length for `bin` (from the offset `byteOffset`)
	 */
	public static from(
		bin: ArrayBuffer | ArrayBufferView,
		byteOffset?: number,
		byteLength?: number
	): IconItem;
	/**
	 * Generates `IconItem` instance from bitmap data binary width actual icon size (width and height).
	 * @param width icon width
	 * @param height icon height
	 * @param bin binary data containing the bitmap data
	 * @param byteOffset byte offset of `bin` referring the bitmap data
	 * @param byteLength available byte length for `bin` (from the offset `byteOffset`)
	 */
	public static from(
		width: number,
		height: number,
		bin: ArrayBuffer | ArrayBufferView,
		byteOffset?: number,
		byteLength?: number
	): IconItem;

	public static from(
		arg1: ArrayBuffer | ArrayBufferView | number,
		arg2?: number,
		arg3?: number | ArrayBuffer | ArrayBufferView,
		byteOffset?: number,
		byteLength?: number
	): IconItem {
		let width: number | null;
		let height: number | null;
		let bin: ArrayBuffer | ArrayBufferView;
		if (typeof arg3 === 'object') {
			// second overload
			width = arg1 as number;
			height = arg2!;
			bin = arg3;
		} else {
			// first overload
			width = null;
			height = null;
			bin = arg1 as ArrayBuffer | ArrayBufferView;
			byteOffset = arg2;
			byteLength = arg3;
		}
		return new IconItem(width, height, bin, byteOffset, byteLength);
	}

	public isIcon(): this is IconItem {
		return true;
	}
	public isRaw(): false {
		return false;
	}

	public generate(): ArrayBuffer {
		const bi = this.bitmapInfo;
		const absWidth = Math.abs(bi.width);
		// round up to 4 bytes (32 bit)
		const absWidthBytes = roundUp(bi.bitCount * absWidth, 32) / 8;
		const absActualHeight = Math.abs(bi.height) / 2;
		const actualSizeImage = absWidthBytes * absActualHeight;
		const sizeMask = calcMaskSize(bi.width, absActualHeight);
		const colorCount = bi.colors.length;
		const totalSize = 40 + 4 * colorCount + actualSizeImage + sizeMask;
		const bin = new ArrayBuffer(totalSize);
		const view = new DataView(bin);
		view.setUint32(0, 40, true);
		view.setInt32(4, bi.width, true);
		view.setInt32(8, bi.height, true);
		view.setUint16(12, bi.planes, true);
		view.setUint16(14, bi.bitCount, true);
		view.setUint32(16, bi.compression, true);
		// image size
		view.setUint32(20, bi.sizeImage, true);
		view.setInt32(24, bi.xPelsPerMeter, true);
		view.setInt32(28, bi.yPelsPerMeter, true);
		view.setUint32(32, bi.colorUsed, true);
		view.setUint32(
			36,
			bi.colorImportant > colorCount ? colorCount : bi.colorImportant,
			true
		);

		let offset = 40;
		bi.colors.forEach((c) => {
			view.setUint8(offset, c.b);
			view.setUint8(offset + 1, c.g);
			view.setUint8(offset + 2, c.r);
			offset += 4;
		});

		copyBuffer(bin, offset, this.pixels, 0, actualSizeImage);
		copyBuffer(bin, offset + actualSizeImage, this.masks, 0, sizeMask);
		return bin;
	}
}

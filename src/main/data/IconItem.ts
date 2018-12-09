
import BitmapInfo from './BitmapInfo';

import {
	allocatePartialBinary,
	copyBuffer,
	readInt32WithLastOffset,
	readUint8WithLastOffset,
	readUint16WithLastOffset,
	readUint32WithLastOffset,
	roundUp
} from '../util/functions';

export default class IconItem {

	public readonly bitmapInfo: BitmapInfo;
	public pixels: ArrayBuffer;
	public masks: ArrayBuffer | null;

	private constructor(bin: ArrayBuffer, byteOffset?: number, byteLength?: number) {
		const view = new DataView(bin, byteOffset, byteLength);
		const totalSize = view.byteLength - view.byteOffset;

		let headerSize = view.getUint32(0, true);
		if (headerSize > totalSize) {
			headerSize = totalSize;
		}
		let sizeImage = readUint32WithLastOffset(view, 20, headerSize);
		const bi: BitmapInfo = {
			width: readInt32WithLastOffset(view, 4, headerSize),
			height: readInt32WithLastOffset(view, 8, headerSize),
			planes: readUint16WithLastOffset(view, 12, headerSize),
			bitCount: readUint16WithLastOffset(view, 14, headerSize),
			compression: readUint32WithLastOffset(view, 16, headerSize),
			xPelsPerMeter: readInt32WithLastOffset(view, 24, headerSize),
			yPelsPerMeter: readInt32WithLastOffset(view, 28, headerSize),
			colorUsed: readUint32WithLastOffset(view, 32, headerSize),
			colorImportant: readUint32WithLastOffset(view, 36, headerSize),
			colors: []
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
		for (let i = 0; i < bi.colorUsed; ++i) {
			bi.colors.push({
				b: readUint8WithLastOffset(view, offset, totalSize),
				g: readUint8WithLastOffset(view, offset + 1, totalSize),
				r: readUint8WithLastOffset(view, offset + 2, totalSize)
			});
			offset += 4;
		}

		this.bitmapInfo = bi;
		const size = sizeImage || (totalSize - offset);
		this.pixels = allocatePartialBinary(bin, offset, size);
		offset += size;
		let maskSize = bi.width * bi.height / 8;
		if (maskSize + offset > totalSize) {
			maskSize = totalSize - offset;
		}
		if (maskSize) {
			this.masks = allocatePartialBinary(bin, offset, maskSize);
		} else {
			this.masks = null;
		}
	}

	public static from(bin: ArrayBuffer, byteOffset?: number, byteLength?: number): IconItem {
		return new IconItem(bin, byteOffset, byteLength);
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
		const absWidthRound = roundUp(absWidth, 8);
		const absActualHeight = Math.abs(bi.height) / 2;
		const sizeImage = bi.bitCount * absWidthRound * absActualHeight / 8;
		const sizeMask = this.masks ? absWidthRound * absActualHeight / 8 : 0;
		let colorCount = bi.colors.length;
		const totalSize = (
			40 +
			(4 * colorCount) +
			(sizeImage) +
			(sizeMask)
		);
		console.log(`totalSize = ${totalSize}, pixelSize = ${sizeImage} @ ${this.pixels.byteLength}, maskSize = ${sizeMask} @ ${this.masks && this.masks.byteLength}`);
		const bin = new ArrayBuffer(totalSize);
		const view = new DataView(bin);
		view.setUint32(0, 40, true);
		view.setInt32(4, bi.width, true);
		view.setInt32(8, bi.height, true);
		view.setUint16(12, bi.planes, true);
		view.setUint16(14, bi.bitCount, true);
		view.setUint32(16, bi.compression, true);
		// image size
		view.setUint32(20, sizeImage, true);
		view.setInt32(24, bi.xPelsPerMeter, true);
		view.setInt32(28, bi.yPelsPerMeter, true);
		view.setUint32(32, colorCount, true);
		view.setUint32(36, bi.colorImportant > colorCount ? colorCount : bi.colorImportant, true);

		let offset = 40;
		bi.colors.forEach((c) => {
			view.setUint8(offset, c.b);
			view.setUint8(offset + 1, c.g);
			view.setUint8(offset + 2, c.r);
			offset += 4;
		});

		copyBuffer(bin, offset, this.pixels, 0, sizeImage);
		if (this.masks) {
			copyBuffer(bin, offset + sizeImage, this.masks, 0, sizeMask);
		}
		return bin;
	}
}

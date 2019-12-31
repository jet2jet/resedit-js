import IconItem from './IconItem';
import RawIconItem from './RawIconItem';

import {
	readUint8WithLastOffset,
	readUint16WithLastOffset,
	readUint32WithLastOffset,
	copyBuffer,
	createDataView,
} from '../util/functions';

// struct ICON_GROUP {
//   uint16_t reserved;
//   uint16_t resType; // 1
//   uint16_t resCount;
//   struct {
//     uint8_t width; // 0 is 256
//     uint8_t height; // 0 is 256
//     uint8_t colors;
//     uint8_t reserved;
//     uint16_t planes;
//     uint16_t bitCount;
//     uint32_t size;
//     uint32_t offset; // icon-file specific
//   } data[resCount];
// }

/**
 * All fields except for 'data' is optional.
 * Missing fields are replaced by 'data' values when generating binary.
 */
export interface IconFileItem {
	width?: number;
	height?: number;
	colors?: number;
	planes?: number;
	bitCount?: number;
	data: IconItem | RawIconItem;
}

function generateEntryBinary(icons: readonly IconFileItem[]): ArrayBuffer {
	let count = icons.length;
	if (count > 65535) {
		count = 65535;
	}
	const tmpIcons = icons.map(item => {
		if (item.data.isIcon()) {
			return {
				item: item,
				bin: item.data.generate(),
				offset: 0,
			};
		} else {
			return {
				item: item,
				bin: item.data.bin,
				offset: 0,
			};
		}
	});
	const size = tmpIcons.reduce((p, icon) => {
		icon.offset = p;
		return p + icon.bin.byteLength;
	}, 6 + 16 * count);
	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, 0, true); // reserved
	view.setUint16(2, 1, true); // icon type
	view.setUint16(4, count, true);

	let offset = 6;
	tmpIcons.forEach(icon => {
		const item = icon.item;
		let width: number;
		let height: number;
		let colors: number;
		let planes: number;
		let bitCount: number;
		if (item.data.isIcon()) {
			const bi = item.data.bitmapInfo;
			width =
				typeof item.width !== 'undefined'
					? item.width
					: Math.abs(bi.width);
			height =
				typeof item.height !== 'undefined'
					? item.height
					: Math.abs(bi.height);
			colors =
				typeof item.colors !== 'undefined'
					? item.colors
					: bi.colorUsed || bi.colors.length;
			planes =
				typeof item.planes !== 'undefined' ? item.planes : bi.planes;
			bitCount =
				typeof item.bitCount !== 'undefined'
					? item.bitCount
					: bi.bitCount;
		} else {
			width =
				typeof item.width !== 'undefined'
					? item.width
					: Math.abs(item.data.width);
			height =
				typeof item.height !== 'undefined'
					? item.height
					: Math.abs(item.data.height);
			colors = typeof item.colors !== 'undefined' ? item.colors : 0;
			planes = typeof item.planes !== 'undefined' ? item.planes : 1;
			bitCount =
				typeof item.bitCount !== 'undefined'
					? item.bitCount
					: item.data.bitCount;
		}
		const dataSize = icon.bin.byteLength;
		view.setUint8(offset, width >= 256 ? 0 : width);
		view.setUint8(offset + 1, height >= 256 ? 0 : height);
		view.setUint8(offset + 2, colors >= 256 ? 0 : colors);
		view.setUint8(offset + 3, 0);
		view.setUint16(offset + 4, planes, true);
		view.setUint16(offset + 6, bitCount, true);
		view.setUint32(offset + 8, dataSize, true);
		view.setUint32(offset + 12, icon.offset, true);
		offset += 16;

		copyBuffer(bin, icon.offset, icon.bin, 0, dataSize);
	});

	return bin;
}

export default class IconFile {
	/** Containing icons */
	public icons: IconFileItem[];

	public constructor();
	/** @internal */
	public constructor(bin: ArrayBuffer | ArrayBufferView);

	public constructor(bin?: ArrayBuffer | ArrayBufferView) {
		if (!bin) {
			this.icons = [];
			return;
		}

		const view = createDataView(bin);
		const totalSize = view.byteLength;
		const icons: IconFileItem[] = [];

		if (view.getUint16(2, true) === 1) {
			const count = view.getUint16(4, true);
			let offset = 6;
			for (let i = 0; i < count; ++i) {
				const dataSize = readUint32WithLastOffset(
					view,
					offset + 8,
					totalSize
				);
				const dataOffset = readUint32WithLastOffset(
					view,
					offset + 12,
					totalSize
				);
				const width = readUint8WithLastOffset(view, offset, totalSize);
				const height = readUint8WithLastOffset(
					view,
					offset + 1,
					totalSize
				);
				const bitCount = readUint8WithLastOffset(
					view,
					offset + 6,
					totalSize
				);
				let data: IconItem | RawIconItem;
				if (view.getUint32(dataOffset, true) === 0x28) {
					data = IconItem.from(
						width,
						height,
						bin,
						dataOffset,
						dataSize
					);
				} else {
					data = RawIconItem.from(
						bin,
						width || 256,
						height || 256,
						bitCount,
						dataOffset,
						dataSize
					);
				}
				icons.push({
					width: width,
					height: height,
					colors: readUint8WithLastOffset(
						view,
						offset + 2,
						totalSize
					),
					planes: readUint16WithLastOffset(
						view,
						offset + 4,
						totalSize
					),
					bitCount: bitCount,
					data: data,
				});
				offset += 16;
			}
		}

		this.icons = icons;
	}

	public static from(bin: ArrayBuffer | ArrayBufferView): IconFile {
		return new IconFile(bin);
	}

	public generate(): ArrayBuffer {
		return generateEntryBinary(this.icons);
	}
}

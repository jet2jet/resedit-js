import ResourceEntry, { ResourceEntryBaseType } from './ResourceEntry';

import IconItem from '../data/IconItem';
import RawIconItem from '../data/RawIconItem';

import {
	readUint8WithLastOffset,
	readUint16WithLastOffset,
	readUint32WithLastOffset,
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
//     uint16_t id; // resource-data specific
//   } data[resCount];
// }

export interface IconGroupItem {
	width: number;
	height: number;
	colors: number;
	planes: number;
	bitCount: number;
	dataSize: number;
	iconID: number;
}

function generateEntryBinary(icons: readonly IconGroupItem[]): ArrayBuffer {
	let count = icons.length;
	if (count > 65535) {
		count = 65535;
	}
	const size = 6 + 14 * icons.length;
	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, 0, true); // reserved
	view.setUint16(2, 1, true); // icon type
	view.setUint16(4, count, true);

	let offset = 6;
	icons.forEach(icon => {
		view.setUint8(offset, icon.width >= 256 ? 0 : icon.width);
		view.setUint8(offset + 1, icon.height >= 256 ? 0 : icon.height);
		view.setUint8(offset + 2, icon.colors >= 256 ? 0 : icon.colors);
		view.setUint8(offset + 3, 0);
		view.setUint16(offset + 4, icon.planes, true);
		view.setUint16(offset + 6, icon.bitCount, true);
		view.setUint32(offset + 8, icon.dataSize, true);
		view.setUint16(offset + 12, icon.iconID, true);
		offset += 14;
	});

	return bin;
}

function findUnusedIconID(
	entries: readonly ResourceEntry[],
	lang: string | number,
	isCursor: boolean
): {
	id: number;
	last: boolean;
} {
	const type = isCursor ? 1 : 3;
	// (ignore string id)
	const filteredIDs = entries
		.filter(
			(e): e is ResourceEntryBaseType<number, number, string | number> =>
				e.type === type && e.lang === lang && typeof e.id === 'number'
		)
		.map(e => e.id)
		.sort((a, b) => a - b);
	let idCurrent = 1;
	for (let i = 0; i < filteredIDs.length; ++i) {
		const id = filteredIDs[i];
		if (idCurrent < id) {
			return {
				id: idCurrent,
				last: false,
			};
		} else if (idCurrent === id) {
			++idCurrent;
		}
	}
	return {
		id: idCurrent,
		last: true,
	};
}

export default class IconGroupEntry {
	public id: string | number;
	public lang: string | number;
	public readonly icons: IconGroupItem[];

	private constructor(groupEntry: ResourceEntry) {
		const view = new DataView(groupEntry.bin);
		const totalSize = view.byteLength;
		const icons: IconGroupItem[] = [];

		if (view.getUint16(2, true) === 1) {
			const count = view.getUint16(4, true);
			let offset = 6;
			for (let i = 0; i < count; ++i) {
				icons.push({
					width: readUint8WithLastOffset(view, offset, totalSize),
					height: readUint8WithLastOffset(
						view,
						offset + 1,
						totalSize
					),
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
					bitCount: readUint16WithLastOffset(
						view,
						offset + 6,
						totalSize
					),
					dataSize: readUint32WithLastOffset(
						view,
						offset + 8,
						totalSize
					),
					iconID: readUint16WithLastOffset(
						view,
						offset + 12,
						totalSize
					),
				});
				offset += 14; // 16 for .ico file, but 14 for resource data
			}
		}

		this.id = groupEntry.id;
		this.lang = groupEntry.lang;
		this.icons = icons;
	}

	public static fromEntries(
		entries: readonly ResourceEntry[]
	): IconGroupEntry[] {
		return entries
			.filter(e => e.type === 14)
			.map(e => new IconGroupEntry(e));
	}

	public generateEntry(): ResourceEntry {
		const bin = generateEntryBinary(this.icons);
		return {
			type: 14,
			id: this.id,
			lang: this.lang,
			codepage: 0,
			bin: bin,
		};
	}

	/**
	 * Return an array of IconItem, which is used by this IconGroupEntry instance,
	 * from specified resource entries.
	 */
	public getIconItemsFromEntries(
		entries: readonly ResourceEntry[]
	): Array<IconItem | RawIconItem> {
		return entries
			.map(e => {
				if (e.type !== 3 || e.lang !== this.lang) {
					return null;
				}
				const c = this.icons.filter(icon => e.id === icon.iconID)[0];
				if (!c) {
					return null;
				}
				return {
					entry: e,
					icon: c,
				};
			})
			.filter((item): item is Exclude<typeof item, null> => !!item)
			.map(item => {
				const bin = item.entry.bin;
				const view = new DataView(bin);
				if (view.getUint32(0, true) === 0x28) {
					return IconItem.from(bin);
				} else {
					const c = item.icon;
					return RawIconItem.from(bin, c.width, c.height, c.bitCount);
				}
			});
	}

	/**
	 * Replace icon resource entries with specified icon data.
	 * The IDs of individual icon resources (RT_ICON) are calculated automatically.
	 * @param destEntries base (destination) resource entries.
	 * @param iconGroupID the icon ID for the new resource data.
	 *     If the icon-group resource of the ID and 'lang' value already exists,
	 *     the resource data is replaced; otherwise the resource data is appended.
	 * @param lang the language for specified icons (0 for neutral, 0x409 for en-US)
	 * @param icons the icons to replace
	 */
	public static replaceIconsForResource(
		destEntries: ResourceEntry[],
		iconGroupID: string | number,
		lang: string | number,
		icons: Array<IconItem | RawIconItem>
	) {
		// find existing entry
		let entry: ResourceEntry | undefined = destEntries.filter(
			e => e.type === 14 && e.id === iconGroupID && e.lang === lang
		)[0];
		interface TempIconData {
			base: IconItem | RawIconItem;
			bm: {
				width: number;
				height: number;
				planes: number;
				bitCount: number;
			};
			bin: ArrayBuffer;
			id: number;
		}
		const tmpIconArray: TempIconData[] = icons.map(
			(icon): TempIconData => {
				if (icon.isIcon()) {
					let { width, height } = icon;
					if (width === null) {
						width = icon.bitmapInfo.width;
					}
					if (height === null) {
						height = icon.bitmapInfo.height;
						// if mask is specified, the icon height must be the half of bitmap height
						if (icon.masks !== null) {
							height = Math.floor(height / 2);
						}
					}
					return {
						base: icon,
						bm: {
							width: width,
							height: height,
							planes: icon.bitmapInfo.planes,
							bitCount: icon.bitmapInfo.bitCount,
						},
						bin: icon.generate(),
						id: 0,
					};
				} else {
					return {
						base: icon,
						bm: {
							width: icon.width,
							height: icon.height,
							planes: 1,
							bitCount: icon.bitCount,
						},
						bin: icon.bin,
						id: 0,
					};
				}
			}
		);

		if (entry) {
			// remove unused icon data
			for (let i = destEntries.length - 1; i >= 0; --i) {
				const e = destEntries[i];
				if (e.type === 3) {
					// RT_ICON
					if (!isIconUsed(e, destEntries, entry)) {
						destEntries.splice(i, 1);
					}
				}
			}
		} else {
			// create new entry
			entry = {
				type: 14,
				id: iconGroupID,
				lang: lang,
				codepage: 0,
				// set later
				bin: (null as any) as ArrayBuffer,
			};
			destEntries.push(entry);
		}

		// append icons
		let idInfo: ReturnType<typeof findUnusedIconID> | undefined;
		tmpIconArray.forEach(icon => {
			if (!idInfo || !idInfo.last) {
				idInfo = findUnusedIconID(destEntries, lang, false);
			} else {
				++idInfo.id;
			}
			destEntries.push({
				type: 3, // RT_ICON
				id: idInfo.id,
				lang: lang,
				codepage: 0,
				bin: icon.bin,
			});
			// set 'id' field to use in generateEntryBinary
			icon.id = idInfo.id;
		});

		const binEntry = generateEntryBinary(
			tmpIconArray.map(
				(icon): IconGroupItem => {
					let width = Math.abs(icon.bm.width);
					if (width >= 256) {
						width = 0;
					}
					let height = Math.abs(icon.bm.height);
					if (height >= 256) {
						height = 0;
					}
					let colors = 0;
					if (icon.base.isIcon()) {
						const bmBase = icon.base.bitmapInfo;
						colors = bmBase.colorUsed || bmBase.colors.length;
						if (!colors) {
							switch (bmBase.bitCount) {
								case 1:
									colors = 2;
									break;
								case 4:
									colors = 16;
									break;
								// case 8:
								// 	colors = 256;
								// 	break;
							}
						}
						if (colors >= 256) {
							colors = 0;
						}
					}
					return {
						width: width,
						height: height,
						colors: colors,
						planes: icon.bm.planes,
						bitCount: icon.bm.bitCount,
						dataSize: icon.bin.byteLength,
						iconID: icon.id,
					};
				}
			)
		);
		// rewrite entry
		entry.bin = binEntry;

		function isIconUsed(
			icon: ResourceEntry,
			allEntries: readonly ResourceEntry[],
			excludeGroup: ResourceEntry
		) {
			return allEntries.some(e => {
				if (
					e.type !== 14 ||
					(e.id === excludeGroup.id && e.lang === excludeGroup.lang)
				) {
					return false;
				}

				const g = new IconGroupEntry(e);
				return g.icons.some(c => {
					return c.iconID === icon.id;
				});
			});
		}
	}
}

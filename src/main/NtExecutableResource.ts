import ImageDirectoryEntry from './format/ImageDirectoryEntry';
import { ImageSectionHeader } from './format/ImageSectionHeaderArray';
import NtExecutable, { NtExecutableSection } from './NtExecutable';
import ResourceEntry, {
	ResourceEntryBaseType,
	ResourceEntryT,
	ResourceEntryTT,
} from './resource/ResourceEntry';
import {
	binaryToString,
	cloneObject,
	copyBuffer,
	roundUp,
	stringToBinary,
} from './util/functions';

function removeDuplicates<T>(a: readonly T[]): T[] {
	return a.reduce<T[]>((p, c) => {
		return p.indexOf(c) >= 0 ? p : p.concat(c);
	}, []);
}

function readString(view: DataView, offset: number): string {
	const length = view.getUint16(offset, true);
	let r = '';
	offset += 2;
	for (let i = 0; i < length; ++i) {
		r += String.fromCharCode(view.getUint16(offset, true));
		offset += 2;
	}
	return r;
}

////////////////////////////////////////////////////////////////////////////////
// read resource entries

interface LanguageEntry {
	lang: string | number;
	dataOffset: number;
}

interface NameEntry {
	name: string | number;
	languageTable: number;
	characteristics: number;
	dateTime: number;
	majorVersion: number;
	minorVersion: number;
}

interface TypeEntry {
	type: string | number;
	nameTable: number;
	characteristics: number;
	dateTime: number;
	majorVersion: number;
	minorVersion: number;
}

type ReadDataCallback = (
	typeEntry: TypeEntry,
	nameEntry: NameEntry,
	langEntry: LanguageEntry
) => void;

function readLanguageTable(
	view: DataView,
	typeEntry: TypeEntry,
	name: string | number,
	languageTable: number,
	cb: ReadDataCallback
) {
	let off = languageTable;
	const nameEntry: NameEntry = {
		name,
		languageTable,
		characteristics: view.getUint32(off, true),
		dateTime: view.getUint32(off + 4, true),
		majorVersion: view.getUint16(off + 8, true),
		minorVersion: view.getUint16(off + 10, true),
	};
	const nameCount = view.getUint16(off + 12, true);
	const idCount = view.getUint16(off + 14, true);
	off += 16;

	for (let i = 0; i < nameCount; ++i) {
		const nameOffset = view.getUint32(off, true) & 0x7fffffff;
		const dataOffset = view.getUint32(off + 4, true);
		// ignore if the offset refers to the next table
		if ((dataOffset & 0x80000000) !== 0) {
			off += 8;
			continue;
		}

		const name = readString(view, nameOffset);
		cb(typeEntry, nameEntry, { lang: name, dataOffset: dataOffset });
		off += 8;
	}
	for (let i = 0; i < idCount; ++i) {
		const id = view.getUint32(off, true) & 0x7fffffff;
		const dataOffset = view.getUint32(off + 4, true);
		// ignore if the offset refers to the next table
		if ((dataOffset & 0x80000000) !== 0) {
			off += 8;
			continue;
		}

		cb(typeEntry, nameEntry, { lang: id, dataOffset: dataOffset });
		off += 8;
	}
}

function readNameTable(
	view: DataView,
	type: string | number,
	nameTable: number,
	cb: ReadDataCallback
) {
	let off = nameTable;
	const typeEntry: TypeEntry = {
		type,
		nameTable,
		characteristics: view.getUint32(off, true),
		dateTime: view.getUint32(off + 4, true),
		majorVersion: view.getUint16(off + 8, true),
		minorVersion: view.getUint16(off + 10, true),
	};
	const nameCount = view.getUint16(off + 12, true);
	const idCount = view.getUint16(off + 14, true);
	off += 16;

	for (let i = 0; i < nameCount; ++i) {
		const nameOffset = view.getUint32(off, true) & 0x7fffffff;
		let nextTable = view.getUint32(off + 4, true);
		// ignore if no next table is available
		if (!(nextTable & 0x80000000)) {
			off += 8;
			continue;
		}
		nextTable &= 0x7fffffff;

		const name = readString(view, nameOffset);
		readLanguageTable(view, typeEntry, name, nextTable, cb);
		off += 8;
	}
	for (let i = 0; i < idCount; ++i) {
		const id = view.getUint32(off, true) & 0x7fffffff;
		let nextTable = view.getUint32(off + 4, true);
		// ignore if no next table is available
		if (!(nextTable & 0x80000000)) {
			off += 8;
			continue;
		}
		nextTable &= 0x7fffffff;

		readLanguageTable(view, typeEntry, id, nextTable, cb);
		off += 8;
	}
}

////////////////////////////////////////////////////////////////////////////////
// generate resource entries

interface DivideEntriesResultTypeCC<
	TType extends string | number,
	TID extends string | number
> {
	id: TID;
	offset?: number;
	s: Array<ResourceEntryBaseType<TType, TID, string>>;
	n: Array<ResourceEntryBaseType<TType, TID, number>>;
}
interface DivideEntriesResultTypeC<TType extends string | number> {
	type: TType;
	offset?: number;
	s: Array<DivideEntriesResultTypeCC<TType, string>>;
	n: Array<DivideEntriesResultTypeCC<TType, number>>;
}

interface DivideEntriesResultType {
	s: Array<DivideEntriesResultTypeC<string>>;
	n: Array<DivideEntriesResultTypeC<number>>;
}

interface StringData {
	offset: number;
	text: string;
}

function divideEntriesImplByID<
	TType extends string | number,
	TID extends string | number
>(
	r: DivideEntriesResultTypeCC<TType, TID>,
	names: string[],
	entries: Array<ResourceEntryTT<TType, TID>>
) {
	const entriesByString: {
		[key: string]: ResourceEntryBaseType<TType, TID, string>;
	} = {};
	const entriesByNumber: {
		[key: number]: ResourceEntryBaseType<TType, TID, number>;
	} = {};
	entries.forEach((e) => {
		if (typeof e.lang === 'string') {
			entriesByString[e.lang] = e as ResourceEntryBaseType<
				TType,
				TID,
				string
			>;
			names.push(e.lang);
		} else {
			entriesByNumber[e.lang] = e as ResourceEntryBaseType<
				TType,
				TID,
				number
			>;
		}
	});
	const strKeys = Object.keys(entriesByString);
	strKeys.sort().forEach((type) => {
		r.s.push(entriesByString[type]);
	});
	const numKeys = Object.keys(entriesByNumber);
	numKeys
		.map((k) => Number(k))
		.sort((a, b) => a - b)
		.forEach((type) => {
			r.n.push(entriesByNumber[type]);
		});
	return 16 + 8 * (strKeys.length + numKeys.length);
}

function divideEntriesImplByName<TType extends string | number>(
	r: DivideEntriesResultTypeC<TType>,
	names: string[],
	entries: Array<ResourceEntryT<TType>>
) {
	const entriesByString: {
		[key: string]: Array<ResourceEntryTT<TType, string>> | undefined;
	} = {};
	const entriesByNumber: {
		[key: number]: Array<ResourceEntryTT<TType, number>> | undefined;
	} = {};
	entries.forEach((e) => {
		if (typeof e.id === 'string') {
			const a = entriesByString[e.id] ?? (entriesByString[e.id] = []);
			names.push(e.id);
			a.push(e as ResourceEntryTT<TType, string>);
		} else {
			const a = entriesByNumber[e.id] ?? (entriesByNumber[e.id] = []);
			a.push(e as ResourceEntryTT<TType, number>);
		}
	});
	const sSum = Object.keys(entriesByString)
		.sort()
		.map((id) => {
			const o: DivideEntriesResultTypeCC<TType, string> = {
				id,
				s: [],
				n: [],
			};
			r.s.push(o);
			return divideEntriesImplByID(o, names, entriesByString[id]!);
		})
		.reduce((p, c) => p + 8 + c, 0);
	const nSum = Object.keys(entriesByNumber)
		.map((k) => Number(k))
		.sort((a, b) => a - b)
		.map((id) => {
			const o: DivideEntriesResultTypeCC<TType, number> = {
				id,
				s: [],
				n: [],
			};
			r.n.push(o);
			return divideEntriesImplByID(o, names, entriesByNumber[id]!);
		})
		.reduce((p, c) => p + 8 + c, 0);
	return 16 + sSum + nSum;
}

function divideEntriesImplByType(
	r: DivideEntriesResultType,
	names: string[],
	entries: ResourceEntry[]
) {
	const entriesByString: {
		[key: string]: Array<ResourceEntryT<string>> | undefined;
	} = {};
	const entriesByNumber: {
		[key: number]: Array<ResourceEntryT<number>> | undefined;
	} = {};
	entries.forEach((e) => {
		if (typeof e.type === 'string') {
			const a = entriesByString[e.type] ?? (entriesByString[e.type] = []);
			names.push(e.type);
			a.push(e as ResourceEntryT<string>);
		} else {
			const a = entriesByNumber[e.type] ?? (entriesByNumber[e.type] = []);
			a.push(e as ResourceEntryT<number>);
		}
	});
	const sSum = Object.keys(entriesByString)
		.sort()
		.map((type) => {
			const o: DivideEntriesResultTypeC<string> = { type, s: [], n: [] };
			r.s.push(o);
			return divideEntriesImplByName(o, names, entriesByString[type]!);
		})
		.reduce((p, c) => p + 8 + c, 0);
	const nSum = Object.keys(entriesByNumber)
		.map((k) => Number(k))
		.sort((a, b) => a - b)
		.map((type) => {
			const o: DivideEntriesResultTypeC<number> = { type, s: [], n: [] };
			r.n.push(o);
			return divideEntriesImplByName(o, names, entriesByNumber[type]!);
		})
		.reduce((p, c) => p + 8 + c, 0);
	return 16 + sSum + nSum;
}

function calculateStringLengthForWrite(text: string): number {
	const length = text.length;
	// limit to 65535 because the 'length' field is uint16
	return length > 65535 ? 65535 : length;
}

function getStringOffset(
	target: string,
	strings: readonly StringData[]
): number {
	const l = strings.length;
	for (let i = 0; i < l; ++i) {
		const s = strings[i];
		if (s.text === target) {
			return s.offset;
		}
	}
	throw new Error('Unexpected');
}

/** (returns offset just after the written text) */
function writeString(view: DataView, offset: number, text: string): number {
	const length = calculateStringLengthForWrite(text);
	view.setUint16(offset, length, true);
	offset += 2;
	for (let i = 0; i < length; ++i) {
		view.setUint16(offset, text.charCodeAt(i), true);
		offset += 2;
	}
	return offset;
}

function writeLanguageTable<
	TType extends string | number,
	TID extends string | number
>(
	view: DataView,
	offset: number,
	strings: readonly StringData[],
	data: DivideEntriesResultTypeCC<TType, TID>
) {
	// characteristics
	view.setUint32(offset, 0, true);
	// timestamp
	view.setUint32(offset + 4, 0, true);
	// major version / minor version
	view.setUint32(offset + 8, 0, true);
	// name entries
	view.setUint16(offset + 12, data.s.length, true);
	// id entries
	view.setUint16(offset + 14, data.n.length, true);

	offset += 16;
	// name entries (not in specification)
	data.s.forEach((e) => {
		const strOff = getStringOffset(e.lang, strings);
		view.setUint32(offset, strOff, true);
		view.setUint32(offset + 4, e.offset!, true);
		offset += 8;
	});
	// id entries
	data.n.forEach((e) => {
		view.setUint32(offset, e.lang, true);
		view.setUint32(offset + 4, e.offset!, true);
		offset += 8;
	});
	return offset;
}

function writeNameTable<TType extends string | number>(
	view: DataView,
	offset: number,
	leafOffset: number,
	strings: readonly StringData[],
	data: DivideEntriesResultTypeC<TType>
) {
	// characteristics
	view.setUint32(offset, 0, true);
	// timestamp
	view.setUint32(offset + 4, 0, true);
	// major version / minor version
	view.setUint32(offset + 8, 0, true);
	// name entries
	view.setUint16(offset + 12, data.s.length, true);
	// id entries
	view.setUint16(offset + 14, data.n.length, true);
	offset += 16;

	data.s.forEach((e) => {
		e.offset = leafOffset;
		leafOffset = writeLanguageTable(view, leafOffset, strings, e);
	});
	data.n.forEach((e) => {
		e.offset = leafOffset;
		leafOffset = writeLanguageTable(view, leafOffset, strings, e);
	});

	data.s.forEach((e) => {
		const strOff = getStringOffset(e.id, strings);
		view.setUint32(offset, strOff + 0x80000000, true);
		view.setUint32(offset + 4, e.offset! + 0x80000000, true);
		offset += 8;
	});
	data.n.forEach((e) => {
		view.setUint32(offset, e.id, true);
		view.setUint32(offset + 4, e.offset! + 0x80000000, true);
		offset += 8;
	});

	return leafOffset;
}

function writeTypeTable(
	view: DataView,
	offset: number,
	strings: readonly StringData[],
	data: DivideEntriesResultType
) {
	// characteristics
	view.setUint32(offset, 0, true);
	// timestamp
	view.setUint32(offset + 4, 0, true);
	// major version / minor version
	view.setUint32(offset + 8, 0, true);
	// name entries
	view.setUint16(offset + 12, data.s.length, true);
	// id entries
	view.setUint16(offset + 14, data.n.length, true);
	offset += 16;

	let nextTableOffset = offset + 8 * (data.s.length + data.n.length);
	data.s.forEach((e) => {
		e.offset = nextTableOffset;
		nextTableOffset += 16 + 8 * (e.s.length + e.n.length);
	});
	data.n.forEach((e) => {
		e.offset = nextTableOffset;
		nextTableOffset += 16 + 8 * (e.s.length + e.n.length);
	});

	data.s.forEach((e) => {
		const strOff = getStringOffset(e.type, strings);
		view.setUint32(offset, strOff + 0x80000000, true);
		view.setUint32(offset + 4, e.offset! + 0x80000000, true);
		offset += 8;
		nextTableOffset = writeNameTable(
			view,
			e.offset!,
			nextTableOffset,
			strings,
			e
		);
	});
	data.n.forEach((e) => {
		view.setUint32(offset, e.type, true);
		view.setUint32(offset + 4, e.offset! + 0x80000000, true);
		offset += 8;
		nextTableOffset = writeNameTable(
			view,
			e.offset!,
			nextTableOffset,
			strings,
			e
		);
	});

	return nextTableOffset;
}

////////////////////////////////////////////////////////////////////////////////

/** Manages resource data for NtExecutable */
export default class NtExecutableResource {
	/** The timestamp for resource */
	public dateTime: number = 0;
	/** The major version data for resource */
	public majorVersion: number = 0;
	/** The minor version data for resource */
	public minorVersion: number = 0;
	/** Resource entries */
	public entries: ResourceEntry[] = [];
	/**
	 * The section data header of resource data (used by outputResource method).
	 * This instance will be null if the base executable does not contain resource data.
	 * You can override this field before calling outputResource method.
	 * (Note that the addresses and sizes are ignored for output)
	 */
	public sectionDataHeader: ImageSectionHeader | null = null;
	private originalSize: number = 0;

	private constructor() {}
	private parse(section: Readonly<NtExecutableSection>) {
		if (!section.data) {
			return;
		}

		const view = new DataView(section.data);
		// --- First: Resource Directory Table ---
		// (off: 0 -- Characteristics (uint32))
		this.dateTime = view.getUint32(4, true);
		this.majorVersion = view.getUint16(8, true);
		this.minorVersion = view.getUint16(10, true);
		const nameCount = view.getUint16(12, true);
		const idCount = view.getUint16(14, true);
		let off = 16;
		const res: ResourceEntry[] = [];
		const cb: ReadDataCallback = (t, n, l) => {
			const off =
				view.getUint32(l.dataOffset, true) -
				section.info.virtualAddress;
			const size = view.getUint32(l.dataOffset + 4, true);
			const cp = view.getUint32(l.dataOffset + 8, true);
			const bin = new Uint8Array(size);
			bin.set(new Uint8Array(section.data!, off, size));
			res.push({
				type: t.type,
				id: n.name,
				lang: l.lang,
				codepage: cp,
				bin: bin.buffer,
			});
		};
		for (let i = 0; i < nameCount; ++i) {
			const nameOffset = view.getUint32(off, true) & 0x7fffffff;
			let nextTable = view.getUint32(off + 4, true);
			// ignore if no next table is available
			if (!(nextTable & 0x80000000)) {
				off += 8;
				continue;
			}
			nextTable &= 0x7fffffff;

			const name = readString(view, nameOffset);
			readNameTable(view, name, nextTable, cb);
			off += 8;
		}
		for (let i = 0; i < idCount; ++i) {
			const typeId = view.getUint32(off, true) & 0x7fffffff;
			let nextTable = view.getUint32(off + 4, true);
			// ignore if no next table is available
			if (!(nextTable & 0x80000000)) {
				off += 8;
				continue;
			}
			nextTable &= 0x7fffffff;

			readNameTable(view, typeId, nextTable, cb);
			off += 8;
		}

		this.entries = res;
		this.originalSize = section.data.byteLength;
	}

	/**
	 * Parses resource data for NtExecutable.
	 * This function returns valid instance even if
	 * the executable does not have resource data.
	 */
	public static from(exe: NtExecutable): NtExecutableResource {
		const secs = ([] as NtExecutableSection[])
			.concat(exe.getAllSections())
			.sort((a, b) => a.info.virtualAddress - b.info.virtualAddress);
		const entry = exe.getSectionByEntry(ImageDirectoryEntry.Resource);
		// check if the section order is supported
		// (not supported if any other sections except 'relocation' is available,
		// because the recalculation of virtual address is not simple)
		if (entry) {
			const reloc = exe.getSectionByEntry(
				ImageDirectoryEntry.BaseRelocation
			);
			for (let i = 0; i < secs.length; ++i) {
				const s = secs[i];
				if (s.info.name === entry.info.name) {
					for (let j = i + 1; j < secs.length; ++j) {
						if (!reloc || secs[j].info.name !== reloc.info.name) {
							throw new Error(
								'After Resource section, sections except for relocation are not supported'
							);
						}
					}
					break;
				}
			}
		}

		const r = new NtExecutableResource();
		r.sectionDataHeader = entry ? cloneObject(entry.info) : null;
		if (entry) {
			r.parse(entry);
		}
		return r;
	}

	/**
	 * Add or replace the resource entry.
	 * This method replaces the entry only if there is an entry with `type`, `id` and `lang` equal.
	 */
	public replaceResourceEntry(entry: ResourceEntry): void {
		for (let len = this.entries.length, i = 0; i < len; ++i) {
			const e = this.entries[i];
			if (
				e.type === entry.type &&
				e.id === entry.id &&
				e.lang === entry.lang
			) {
				this.entries[i] = entry;
				return;
			}
		}
		this.entries.push(entry);
	}

	/**
	 * Returns all resource entries, which has specified type and id, as UTF-8 string data.
	 * @param type Resource type
	 * @param id Resource id
	 * @returns an array of lang and value pair (tuple)
	 */
	public getResourceEntriesAsString(
		type: string | number,
		id: string | number
	): Array<[lang: string | number, value: string]> {
		return this.entries
			.filter((entry) => entry.type === type && entry.id === id)
			.map((entry) => [entry.lang, binaryToString(entry.bin)]);
	}

	/**
	 * Add or replace the resource entry with UTF-8 string data.
	 * This method is a wrapper of {@link NtExecutableResource.replaceResourceEntry}.
	 */
	public replaceResourceEntryFromString(
		type: string | number,
		id: string | number,
		lang: string | number,
		value: string
	): void {
		const entry: ResourceEntry = {
			type,
			id,
			lang,
			codepage: 1200,
			bin: stringToBinary(value),
		};
		this.replaceResourceEntry(entry);
	}

	/**
	 * Removes resource entries which has specified type and id.
	 */
	public removeResourceEntry(
		type: string | number,
		id: string | number,
		lang?: string | number
	): void {
		this.entries = this.entries.filter(
			(entry) =>
				!(
					entry.type === type &&
					entry.id === id &&
					(typeof lang === 'undefined' || entry.lang === lang)
				)
		);
	}

	/**
	 * Generates resource data binary for NtExecutable (not for .res file)
	 * @param virtualAddress The virtual address for the section
	 * @param alignment File alignment value of executable
	 * @param noGrow Set true to disallow growing resource section (throw errors if data exceeds)
	 * @param allowShrink Set true to allow shrinking resource section (if the data size is less than original)
	 */
	public generateResourceData(
		virtualAddress: number,
		alignment: number,
		noGrow: boolean = false,
		allowShrink: boolean = false
	): {
		bin: ArrayBuffer;
		rawSize: number;
		dataOffset: number;
		descEntryOffset: number;
		descEntryCount: number;
	} {
		// estimate data size and divide to output table
		const r: DivideEntriesResultType = {
			s: [],
			n: [],
		};
		let strings: string[] = [];
		let size = divideEntriesImplByType(r, strings, this.entries);
		strings = removeDuplicates(strings);
		const stringsOffset = size;
		size += strings.reduce((prev, cur) => {
			return prev + 2 + calculateStringLengthForWrite(cur) * 2;
		}, 0);
		size = roundUp(size, 8);
		const descOffset = size;
		size = this.entries.reduce((p, e) => {
			e.offset = p;
			return p + 16;
		}, descOffset);
		const dataOffset = size;
		size = this.entries.reduce((p, e) => {
			return roundUp(p, 8) + e.bin.byteLength;
		}, dataOffset);

		let alignedSize = roundUp(size, alignment);
		const originalAlignedSize = roundUp(this.originalSize, alignment);

		if (noGrow) {
			if (alignedSize > originalAlignedSize) {
				throw new Error('New resource data is larger than original');
			}
		}
		if (!allowShrink) {
			if (alignedSize < originalAlignedSize) {
				alignedSize = originalAlignedSize;
			}
		}

		// generate binary
		const bin = new ArrayBuffer(alignedSize);
		const view = new DataView(bin);

		let o = descOffset;
		let va = virtualAddress + dataOffset;
		this.entries.forEach((e) => {
			const len = e.bin.byteLength;
			va = roundUp(va, 8);
			// RVA
			view.setUint32(o, va, true);
			// size
			view.setUint32(o + 4, len, true);
			// codepage
			view.setUint32(o + 8, e.codepage, true);
			// (zero)
			view.setUint32(o + 12, 0, true);
			va += len;
			o += 16;
		});

		o = dataOffset;
		this.entries.forEach((e) => {
			const len = e.bin.byteLength;
			copyBuffer(bin, o, e.bin, 0, len);
			o += roundUp(len, 8);
		});

		const stringsData: StringData[] = [];
		o = stringsOffset;
		strings.forEach((s) => {
			stringsData.push({
				offset: o,
				text: s,
			});
			o = writeString(view, o, s);
		});

		writeTypeTable(view, 0, stringsData, r);

		// fill with 'PADDINGX'
		if (alignedSize > size) {
			const pad = 'PADDINGX';
			for (let i = size, j = 0; i < alignedSize; ++i, ++j) {
				if (j === 8) {
					j = 0;
				}
				view.setUint8(i, pad.charCodeAt(j));
			}
		}

		return {
			bin: bin,
			rawSize: size,
			dataOffset: dataOffset,
			descEntryOffset: descOffset,
			descEntryCount: this.entries.length,
		};
	}

	/**
	 * Writes holding resource data to specified NtExecutable instance.
	 * @param exeDest An NtExecutable instance to write resource section to
	 * @param noGrow Set true to disallow growing resource section (throw errors if data exceeds)
	 * @param allowShrink Set true to allow shrinking resource section (if the data size is less than original)
	 */
	public outputResource(
		exeDest: NtExecutable,
		noGrow: boolean = false,
		allowShrink: boolean = false
	): void {
		// make section data
		const fileAlign = exeDest.getFileAlignment();
		let sectionData: NtExecutableSection;
		if (this.sectionDataHeader) {
			sectionData = {
				data: null,
				info: cloneObject(this.sectionDataHeader),
			};
		} else {
			sectionData = {
				data: null,
				info: {
					name: '.rsrc',
					virtualSize: 0,
					virtualAddress: 0,
					sizeOfRawData: 0,
					pointerToRawData: 0,
					pointerToRelocations: 0,
					pointerToLineNumbers: 0,
					numberOfRelocations: 0,
					numberOfLineNumbers: 0,
					characteristics: 0x40000040, // read access and initialized data
				},
			};
		}

		// first, set virtualAddress to 0 because
		// the virtual address is not determined now
		const data = this.generateResourceData(
			0,
			fileAlign,
			noGrow,
			allowShrink
		);

		sectionData.data = data.bin;
		sectionData.info.sizeOfRawData = data.bin.byteLength;
		sectionData.info.virtualSize = data.rawSize;

		// write as section
		exeDest.setSectionByEntry(ImageDirectoryEntry.Resource, sectionData);

		// rewrite section raw-data
		const generatedSection = exeDest.getSectionByEntry(
			ImageDirectoryEntry.Resource
		)!;
		const view = new DataView(generatedSection.data!);
		// set RVA
		let o = data.descEntryOffset;
		let va = generatedSection.info.virtualAddress + data.dataOffset;
		for (let i = 0; i < data.descEntryCount; ++i) {
			const len = view.getUint32(o + 4, true);
			va = roundUp(va, 8);
			// RVA
			view.setUint32(o, va, true);
			va += len;
			o += 16;
		}
	}
}

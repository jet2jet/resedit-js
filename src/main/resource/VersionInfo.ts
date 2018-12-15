
import ResourceEntry from './ResourceEntry';

import {
	allocatePartialBinary,
	copyBuffer,
	readUint32WithLastOffset,
	roundUp
} from '../util/functions';

interface VersionStringTable {
	lang: number;
	codepage: number;
	values: { [key: string]: string };
}

/** Translation information, containing LANGID and codepage value. */
export interface VersionTranslation {
	lang: number;
	/** Almost all cases are set to 1200 (Unicode) */
	codepage: number;
}

interface VersionUnknownData {
	name: string;
	entireBin: ArrayBuffer;
}

/** Fixed version info, containing file version, product version, etc. */
export interface VersionFixedInfo {
	/** usually major version in HIWORD(fileVersionMS), minor version in LOWORD(fileVersionMS) */
	fileVersionMS: number;
	/** usually patch version in HIWORD(fileVersionLS), revision in LOWORD(fileVersionLS) */
	fileVersionLS: number;
	productVersionMS: number;
	productVersionLS: number;
	/** valid values of fileFlags */
	fileFlagsMask: number;
	/** zero or more VersionFileFlags values, masked by fileFlagsMask */
	fileFlags: number;
	/** VersionFileOS value */
	fileOS: number;
	/** VersionFileType value */
	fileType: number;
	/**
		* subtype values depended on fileType, such as
		* VersionFileDriverSubtype or VersionFileFontSubtype.
		* (if no suitable value, zero is stored)
		*/
	fileSubtype: number;
	fileDateMS: number;
	fileDateLS: number;
}

interface VersionEntry {
	lang: string | number;
	fixedInfo: VersionFixedInfo;
	strings: VersionStringTable[];
	translations: VersionTranslation[];
	unknowns: VersionUnknownData[];
}

function readStringToNullChar(view: DataView, offset: number, last: number): string {
	let r = '';
	while (offset + 2 <= last) {
		const c = view.getUint16(offset, true);
		if (!c) {
			break;
		}
		r += String.fromCharCode(c);
		offset += 2;
	}
	return r;
}

function writeStringWithNullChar(view: DataView, offset: number, value: string): number {
	for (let i = 0; i < value.length; ++i) {
		view.setUint16(offset, value.charCodeAt(i), true);
		offset += 2;
	}
	view.setUint16(offset, 0, true);
	return offset + 2;
}

function createFixedInfo(): VersionFixedInfo {
	return {
		fileVersionMS: 0,
		fileVersionLS: 0,
		productVersionMS: 0,
		productVersionLS: 0,
		fileFlagsMask: 0,
		fileFlags: 0,
		fileOS: 0, // Unknown
		fileType: 0, // Unknown
		fileSubtype: 0,
		fileDateMS: 0,
		fileDateLS: 0
	};
}

////////////////////////////////////////////////////////////////////////////////
// parsings

// returns offset and structure
function parseStringTable(view: DataView, offset: number, last: number): [number, VersionStringTable] {
	const tableLen = view.getUint16(offset, true);
	const valueLen = view.getUint16(offset + 2, true);
	if (offset + tableLen < last) {
		last = offset + tableLen;
	}
	// value type check is not needed; because no value is needed

	const tableName = readStringToNullChar(view, offset + 6, last);
	offset += roundUp(6 + 2 * (tableName.length + 1), 4);

	const langAndCp = parseInt(tableName, 16);
	if (isNaN(langAndCp)) {
		throw new Error('Invalid StringTable data format');
	}

	// this should be zero
	offset += roundUp(valueLen, 4);

	const r: VersionStringTable = {
		lang: Math.floor(langAndCp / 0x10000),
		codepage: (langAndCp & 0xFFFF),
		values: {}
	};

	while (offset < last) {
		// String structure
		const childDataLen = view.getUint16(offset, true);
		const childValueLen = view.getUint16(offset + 2, true);
		// value type must be string; if not, skip it
		if (view.getUint16(offset + 4, true) !== 1) {
			offset += childDataLen;
			continue;
		}
		let childDataLast = offset + childDataLen;
		if (childDataLast > last) {
			childDataLast = last;
		}
		const name = readStringToNullChar(view, offset + 6, childDataLast);
		offset = roundUp(offset + 6 + 2 * (name.length + 1), 4);

		let childValueLast = offset + childValueLen * 2;
		if (childValueLast > childDataLast) {
			childValueLast = childDataLast;
		}
		const value = readStringToNullChar(view, offset, childValueLast);
		offset = roundUp(childValueLast, 4);

		r.values[name] = value;
	}
	// return 'last' instead of 'offset'
	return [last, r];
}

function parseStringFileInfo(view: DataView, offset: number, last: number): VersionStringTable[] {
	let valueLen = view.getUint16(offset + 2, true);
	// value type check is not needed; because no value is needed

	offset += 36; // roundUp(6 + ByteLenWithNull(L'StringFileInfo'), 4)
	// this should be zero
	offset += roundUp(valueLen, 4);

	const r: VersionStringTable[] = [];
	while (offset < last) {
		// StringTable structure
		const childData = parseStringTable(view, offset, last);
		const table = childData[1];

		const a = r.filter((e) => (e.lang === table.lang && e.codepage === table.codepage));
		if (a.length === 0) {
			r.push(table);
		} else {
			// merge values
			for (const key in table.values) {
				a[0].values[key] = table.values[key];
			}
		}
		offset = childData[0];
	}
	return r;
}

function parseVarFileInfo(view: DataView, offset: number, last: number): VersionTranslation[] {
	let valueLen = view.getUint16(offset + 2, true);
	// value type check is not needed; because no value is needed

	offset += 32; // roundUp(6 + ByteLenWithNull(L'VarFileInfo'), 4)
	// this should be zero
	offset += roundUp(valueLen, 4);

	const r: VersionTranslation[] = [];

	while (offset < last) {
		// Var structure
		const childDataLen = view.getUint16(offset, true);
		const childValueLen = view.getUint16(offset + 2, true);
		// value type must be binary; if not, skip it
		if (view.getUint16(offset + 4, true) !== 0) {
			offset += childDataLen;
			continue;
		}
		let childDataLast = offset + childDataLen;
		if (childDataLast > last) {
			childDataLast = last;
		}
		const name = readStringToNullChar(view, offset + 6, childDataLast);
		offset = roundUp(offset + 6 + 2 * (name.length + 1), 4);
		if (name !== 'Translation' || childValueLen % 4 !== 0) {
			// unknown entry
			offset = roundUp(childDataLast, 4);
			continue;
		}

		for (let child = 0; child < childValueLen; child += 4) {
			if (offset + 4 > childDataLast) {
				break;
			}
			const lang = view.getUint16(offset, true);
			const codepage = view.getUint16(offset + 2, true);
			offset += 4;

			if (r.filter((e) => (e.lang === lang && e.codepage === codepage)).length === 0) {
				r.push({ lang, codepage });
			}
		}
		offset = roundUp(childDataLast, 4);
	}

	return r;
}

function parseVersionEntry(view: DataView, entry: ResourceEntry): VersionEntry {
	const totalLen = view.getUint16(0, true);
	let dataLen = view.getUint16(2, true);
	// value type must be binary
	if (view.getUint16(4, true) !== 0) {
		throw new Error('Invalid version data format');
	}
	// 40 === roundUp(6 + ByteLenWithNull(L'VS_VERSION_INFO'), 4)
	if (totalLen < dataLen + 40) {
		throw new Error('Invalid version data format');
	}
	if (readStringToNullChar(view, 6, totalLen) !== 'VS_VERSION_INFO') {
		throw new Error('Invalid version data format');
	}
	const d: VersionEntry = {
		lang: entry.lang,
		fixedInfo: createFixedInfo(),
		strings: [],
		translations: [],
		unknowns: []
	};
	let offset = 38; // without padding
	if (dataLen) {
		dataLen += 40; // with padding
		const sig = readUint32WithLastOffset(view, 40, dataLen);
		const sVer = readUint32WithLastOffset(view, 44, dataLen);
		// check signature
		if (sig === 0xFEEF04BD && sVer <= 0x10000) {
			d.fixedInfo = {
				fileVersionMS: readUint32WithLastOffset(view, 48, dataLen),
				fileVersionLS: readUint32WithLastOffset(view, 52, dataLen),
				productVersionMS: readUint32WithLastOffset(view, 56, dataLen),
				productVersionLS: readUint32WithLastOffset(view, 60, dataLen),
				fileFlagsMask: readUint32WithLastOffset(view, 64, dataLen),
				fileFlags: readUint32WithLastOffset(view, 68, dataLen),
				fileOS: readUint32WithLastOffset(view, 72, dataLen),
				fileType: readUint32WithLastOffset(view, 76, dataLen),
				fileSubtype: readUint32WithLastOffset(view, 80, dataLen),
				fileDateMS: readUint32WithLastOffset(view, 84, dataLen),
				fileDateLS: readUint32WithLastOffset(view, 88, dataLen),
			};
		}
		offset = dataLen;
	}
	offset = roundUp(offset, 4);
	// parse children
	while (offset < totalLen) {
		const childLen = view.getUint16(offset, true);
		let childLast = offset + childLen;
		// failsafe
		if (childLast > totalLen) {
			childLast = totalLen;
		}
		const name = readStringToNullChar(view, offset + 6, childLast);
		switch (name) {
			case 'StringFileInfo':
				d.strings = d.strings.concat(parseStringFileInfo(view, offset, childLast));
				break;
			case 'VarFileInfo':
				d.translations = d.translations.concat(parseVarFileInfo(view, offset, childLast));
				break;
			default:
				// unknown or unsupported type
				d.unknowns.push({
					name,
					entireBin: allocatePartialBinary(view.buffer, view.byteOffset + offset, childLen)
				});
				break;
		}
		offset += roundUp(childLen, 4);
	}
	return d;
}

////////////////////////////////////////////////////////////////////////////////
// serializings

function generateStringTable(table: VersionStringTable): ArrayBuffer {
	// estimate size
	let size = 24; // roundUp(6 + ByteLenWithNull(L'xxxxxxxx'), 4)
	const keys = Object.keys(table.values);
	size = keys.reduce((prev, key) => {
		const value = table.values[key];
		const childHeaderSize = roundUp(6 + 2 * (key.length + 1), 4);
		const newSize = roundUp(prev + childHeaderSize + 2 * (value.length + 1), 4);
		// limit to 65532 because the table size is restricted to 16-bit value
		return newSize > 65532 ? prev : newSize;
	}, size);

	// generate binary
	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 0, true); // no value length
	view.setUint16(4, 1, true);
	let langAndCp = ((table.lang & 0xFFFF) * 0x10000 + (table.codepage & 0xFFFF)).toString(16).toLowerCase();
	// fixed length
	if (langAndCp.length < 8) {
		const l = 8 - langAndCp.length;
		langAndCp = '00000000'.substr(0, l) + langAndCp;
	}
	let offset = roundUp(writeStringWithNullChar(view, 6, langAndCp), 4);

	keys.forEach((key) => {
		const value = table.values[key];
		const childHeaderSize = roundUp(6 + 2 * (key.length + 1), 4);
		const newSize = roundUp(childHeaderSize + 2 * (value.length + 1), 4);
		if (offset + newSize <= 65532) {
			view.setUint16(offset, newSize, true);
			view.setUint16(offset + 2, value.length + 1, true); // value length is in character count
			view.setUint16(offset + 4, 1, true);
			offset = roundUp(writeStringWithNullChar(view, offset + 6, key), 4);
			offset = roundUp(writeStringWithNullChar(view, offset, value), 4);
		}
	});

	return bin;
}

function generateStringTableInfo(tables: VersionStringTable[]): ArrayBuffer {
	// estimate size
	let size = 36; // roundUp(6 + ByteLenWithNull(L'StringFileInfo'), 4)
	const tableBins = tables.map((table) => generateStringTable(table));
	// (all table sizes are rounded up)
	size += tableBins.reduce((p, c) => (p + c.byteLength), 0);

	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 0, true); // no value length
	view.setUint16(4, 1, true);
	let offset = roundUp(writeStringWithNullChar(view, 6, 'StringFileInfo'), 4);
	tableBins.forEach((table) => {
		const len = table.byteLength;
		copyBuffer(bin, offset, table, 0, len);
		offset += len;
	});

	return bin;
}

function generateVarFileInfo(translations: VersionTranslation[]): ArrayBuffer {
	// estimate size
	let size = 32; // roundUp(6 + ByteLenWithNull(L'VarFileInfo'), 4)
	// (translation data is fixed length)
	const translationsValueSize = translations.length * 4;
	size += 32 + translationsValueSize;

	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 0, true); // no value length
	view.setUint16(4, 1, true);
	let offset = roundUp(writeStringWithNullChar(view, 6, 'VarFileInfo'), 4);

	view.setUint16(offset, 32 + translationsValueSize, true);
	view.setUint16(offset + 2, translationsValueSize, true);
	view.setUint16(offset + 4, 0, true);
	offset = roundUp(writeStringWithNullChar(view, offset + 6, 'Translation'), 4);
	translations.forEach((translation) => {
		view.setUint16(offset, translation.lang, true);
		view.setUint16(offset + 2, translation.codepage, true);
		offset += 4;
	});

	return bin;
}

function generateVersionEntryBinary(entry: VersionEntry): ArrayBuffer {
	let size = 92; // roundUp(6 + ByteLenWithNull(L'VS_VERSION_INFO'), 4) + 52 (sizeof VS_FIXEDFILEINFO)

	const stringTableInfoBin = generateStringTableInfo(entry.strings);
	const stringTableInfoLen = stringTableInfoBin.byteLength;
	size += stringTableInfoLen;

	const varFileInfoBin = generateVarFileInfo(entry.translations);
	const varFileInfoLen = varFileInfoBin.byteLength;
	size += varFileInfoLen;

	size = entry.unknowns.reduce((p, data) => (p + roundUp(data.entireBin.byteLength, 4)), size);

	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 52, true);
	view.setUint16(4, 0, true); // value is binary
	let offset = roundUp(writeStringWithNullChar(view, 6, 'VS_VERSION_INFO'), 4);

	view.setUint32(offset, 0xFEEF04BD, true); // signature
	view.setUint32(offset + 4, 0x10000, true); // structure version
	view.setUint32(offset + 8, entry.fixedInfo.fileVersionMS, true);
	view.setUint32(offset + 12, entry.fixedInfo.fileVersionLS, true);
	view.setUint32(offset + 16, entry.fixedInfo.productVersionMS, true);
	view.setUint32(offset + 20, entry.fixedInfo.productVersionLS, true);
	view.setUint32(offset + 24, entry.fixedInfo.fileFlagsMask, true);
	view.setUint32(offset + 28, entry.fixedInfo.fileFlags, true);
	view.setUint32(offset + 32, entry.fixedInfo.fileOS, true);
	view.setUint32(offset + 36, entry.fixedInfo.fileType, true);
	view.setUint32(offset + 40, entry.fixedInfo.fileSubtype, true);
	view.setUint32(offset + 44, entry.fixedInfo.fileDateMS, true);
	view.setUint32(offset + 48, entry.fixedInfo.fileDateLS, true);
	offset += 52;

	copyBuffer(bin, offset, stringTableInfoBin, 0, stringTableInfoLen);
	offset += stringTableInfoLen;
	copyBuffer(bin, offset, varFileInfoBin, 0, varFileInfoLen);
	offset += varFileInfoLen;

	entry.unknowns.forEach((e) => {
		const len = e.entireBin.byteLength;
		copyBuffer(bin, offset, e.entireBin, 0, len);
		offset += roundUp(len, 4);
	});

	return bin;
}

////////////////////////////////////////////////////////////////////////////////

export default class VersionInfo {

	private data: VersionEntry;

	private constructor(entry?: ResourceEntry) {
		if (!entry) {
			this.data = {
				lang: 0, // MAKELANGID(LANG_NEUTRAL, SUBLANG_NEUTRAL)
				fixedInfo: createFixedInfo(),
				strings: [],
				translations: [],
				unknowns: []
			};
		} else {
			const view = new DataView(entry.bin);
			this.data = parseVersionEntry(view, entry);
		}
	}

	public static createEmpty() {
		return new VersionInfo();
	}

	/** Pick up all version-info entries */
	public static fromEntries(entries: ReadonlyArray<ResourceEntry>): VersionInfo[] {
		return entries.filter((e) => e.type === 16).map((e) => new VersionInfo(e));
	}

	public get lang() {
		return this.data.lang;
	}
	public set lang(value: string | number) {
		this.data.lang = value;
	}

	/**
	 * The property of fixed version info, containing file version, product version, etc.
	 * Although this property is read-only, you can rewrite
	 * each child fields directly to apply data.
	 */
	public get fixedInfo() {
		return this.data.fixedInfo;
	}

	public getAvailableLanguages() {
		return this.data.translations.slice(0);
	}
	public getStringValues(language: VersionTranslation): { [key: string]: string } {
		const a = this.data.strings.filter(
			(e) => (e.lang === language.lang && e.codepage === language.codepage)
		).map((e) => e.values);
		return a.length > 0 ? a[0] : {};
	}
	/**
	 * Add or replace the string values.
	 * @param language language info (if not in getAvailableLanguages(), then add it)
	 * @param values string values (key-value pairs)
	 */
	public setStringValues(language: VersionTranslation, values: { [key: string]: string }) {
		const a = this.data.strings.filter(
			(e) => (e.lang === language.lang && e.codepage === language.codepage)
		);
		let table: VersionStringTable;
		if (a.length === 0) {
			table = {
				lang: language.lang,
				codepage: language.codepage,
				values: {}
			};
			this.data.strings.push(table);
		} else {
			table = a[0];
		}
		for (const key in values) {
			table.values[key] = values[key];
		}

		// if no translation is available, then add it
		const t = this.data.translations.filter(
			(e) => (e.lang === language.lang && e.codepage === language.codepage)
		);
		if (t.length === 0) {
			this.data.translations.push({
				lang: language.lang,
				codepage: language.codepage
			});
		}
	}
	/**
	 * Add or replace the string value.
	 * @param language language info (if not in getAvailableLanguages(), then add it)
	 * @param key the key name of string value
	 * @param value the string value
	 */
	public setStringValue(language: VersionTranslation, key: string, value: string) {
		this.setStringValues(language, { [key]: value });
	}
	/**
	 * Remove all string values for specified language.
	 * @param language language info
	 */
	public removeAllStringValues(language: VersionTranslation) {
		const strings = this.data.strings;
		const len = strings.length;
		for (let i = 0; i < len; ++i) {
			const e = strings[i];
			if (e.lang === language.lang && e.codepage === language.codepage) {
				strings.splice(i, 1);
				const translations = this.data.translations;
				for (let j = 0; j < translations.length; j++) {
					const t = translations[j];
					if (t.lang === language.lang && t.codepage === language.codepage) {
						translations.splice(j, 1);
						break;
					}
				}
				break;
			}
		}
	}
	/**
	 * Remove specified string value for specified language.
	 * @param language language info
	 * @param key the key name of string value to be removed
	 */
	public removeStringValue(language: VersionTranslation, key: string) {
		const strings = this.data.strings;
		const len = strings.length;
		for (let i = 0; i < len; ++i) {
			const e = strings[i];
			if (e.lang === language.lang && e.codepage === language.codepage) {
				try { delete e.values[key]; } catch (_ex) { }
				if (Object.keys(e.values).length === 0) {
					// if no entries are left, remove table and translations
					strings.splice(i, 1);
					const translations = this.data.translations;
					for (let j = 0; j < translations.length; j++) {
						const t = translations[j];
						if (t.lang === language.lang && t.codepage === language.codepage) {
							translations.splice(j, 1);
							break;
						}
					}
				}
				break;
			}
		}
	}

	public generateResource(): ResourceEntry {
		const bin = generateVersionEntryBinary(this.data);

		return {
			type: 16,
			id: 1,
			lang: this.lang,
			codepage: 1200,
			bin
		};
	}

	public outputToResourceEntries(entries: ResourceEntry[]) {
		const res = this.generateResource();

		const len = entries.length;
		for (let i = 0; i < len; ++i) {
			const e = entries[i];
			if (e.type === 16 && e.id === res.id && e.lang === res.lang) {
				entries[i] = res;
				return;
			}
		}

		entries.push(res);
	}
}

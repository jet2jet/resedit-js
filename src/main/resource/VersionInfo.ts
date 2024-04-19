import { type Type } from 'pe-library';

import {
	allocatePartialBinary,
	cloneObject,
	copyBuffer,
	readUint32WithLastOffset,
	roundUp,
} from '../util/functions.js';

/**
 * String values for the version information.
 * In most cases predefined names are used for the key names (such as 'FileDescription', 'FileVersion', etc.)
 * Note that the key names are case-sensitive; this library does not convert keys
 * (e.g. `'fileVersion'` --> `'FileVersion'`).
 */
export type VersionStringValues = Record<string, string>;

/** Used by `VersionInfo.create` */
export interface VersionStringTable {
	lang: number;
	codepage: number;
	/** Any string values */
	values: VersionStringValues;
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

/** Fixed version info, containing file version, product version, etc. (`VS_FIXEDFILEINFO`) */
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
	 * `VersionFileDriverSubtype` or `VersionFileFontSubtype`.
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

function readStringToNullChar(
	view: DataView,
	offset: number,
	last: number
): string {
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

function writeStringWithNullChar(
	view: DataView,
	offset: number,
	value: string
): number {
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
		fileDateLS: 0,
	};
}

////////////////////////////////////////////////////////////////////////////////
// parsings

// returns offset and structure
function parseStringTable(
	view: DataView,
	offset: number,
	last: number
): [number, VersionStringTable] {
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
		codepage: langAndCp & 0xffff,
		values: {},
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

function parseStringFileInfo(
	view: DataView,
	offset: number,
	last: number
): VersionStringTable[] {
	const valueLen = view.getUint16(offset + 2, true);
	// value type check is not needed; because no value is needed

	offset += 36; // roundUp(6 + ByteLenWithNull(L'StringFileInfo'), 4)
	// this should be zero
	offset += roundUp(valueLen, 4);

	const r: VersionStringTable[] = [];
	while (offset < last) {
		// StringTable structure
		const childData = parseStringTable(view, offset, last);
		const table = childData[1];

		const a = r.filter(
			(e) => e.lang === table.lang && e.codepage === table.codepage
		);
		if (a.length === 0) {
			r.push(table);
		} else {
			// merge values
			for (const key in table.values) {
				const value = table.values[key];
				if (value != null) {
					a[0]!.values[key] = value;
				}
			}
		}
		offset = roundUp(childData[0], 4);
	}
	return r;
}

function parseVarFileInfo(
	view: DataView,
	offset: number,
	last: number
): VersionTranslation[] {
	const valueLen = view.getUint16(offset + 2, true);
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
			offset += roundUp(childDataLen, 4);
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

			if (
				r.filter((e) => e.lang === lang && e.codepage === codepage)
					.length === 0
			) {
				r.push({ lang, codepage });
			}
		}
		offset = roundUp(childDataLast, 4);
	}

	return r;
}

function parseVersionEntry(
	view: DataView,
	entry: Type.ResourceEntry
): VersionEntry {
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
		unknowns: [],
	};
	let offset = 38; // without padding
	if (dataLen) {
		dataLen += 40; // with padding
		const sig = readUint32WithLastOffset(view, 40, dataLen);
		const sVer = readUint32WithLastOffset(view, 44, dataLen);
		// check signature
		if (sig === 0xfeef04bd && sVer <= 0x10000) {
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
				d.strings = d.strings.concat(
					parseStringFileInfo(view, offset, childLast)
				);
				break;
			case 'VarFileInfo':
				d.translations = d.translations.concat(
					parseVarFileInfo(view, offset, childLast)
				);
				break;
			default:
				// unknown or unsupported type
				d.unknowns.push({
					name,
					entireBin: allocatePartialBinary(view, offset, childLen),
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
		if (value == null) {
			return prev;
		}
		const childHeaderSize = roundUp(6 + 2 * (key.length + 1), 4);
		const newSize = roundUp(
			prev + childHeaderSize + 2 * (value.length + 1),
			4
		);
		// limit to 65532 because the table size is restricted to 16-bit value
		return newSize > 65532 ? prev : newSize;
	}, size);

	// generate binary
	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 0, true); // no value length
	view.setUint16(4, 1, true);
	let langAndCp = (
		(table.lang & 0xffff) * 0x10000 +
		(table.codepage & 0xffff)
	)
		.toString(16)
		.toLowerCase();
	// fixed length
	if (langAndCp.length < 8) {
		const l = 8 - langAndCp.length;
		langAndCp = '00000000'.substr(0, l) + langAndCp;
	}
	let offset = roundUp(writeStringWithNullChar(view, 6, langAndCp), 4);

	keys.forEach((key) => {
		const value = table.values[key];
		if (value == null) {
			return;
		}
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
	size += tableBins.reduce((p, c) => p + c.byteLength, 0);

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
	offset = roundUp(
		writeStringWithNullChar(view, offset + 6, 'Translation'),
		4
	);
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

	size = entry.unknowns.reduce(
		(p, data) => p + roundUp(data.entireBin.byteLength, 4),
		size
	);

	const bin = new ArrayBuffer(size);
	const view = new DataView(bin);

	view.setUint16(0, size, true);
	view.setUint16(2, 52, true);
	view.setUint16(4, 0, true); // value is binary
	let offset = roundUp(
		writeStringWithNullChar(view, 6, 'VS_VERSION_INFO'),
		4
	);

	view.setUint32(offset, 0xfeef04bd, true); // signature
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

export interface VersionInfoCreateParam {
	lang: string | number;
	/** This field can be as a partial object; default values (zero) are used for all unspecified field. */
	fixedInfo: Partial<Readonly<VersionFixedInfo>>;
	strings: readonly VersionStringTable[];
}

////////////////////////////////////////////////////////////////////////////////

function clampInt(val: number, min: number, max: number) {
	if (isNaN(val) || val < min) {
		return min;
	} else if (val >= max) {
		return max;
	}
	return Math.floor(val);
}

function parseVersionArguments(
	arg1: string | number,
	arg2?: number,
	arg3?: number,
	arg4?: number,
	arg5?: number
): [
	major: number,
	minor: number,
	micro: number,
	revision: number,
	lang: number | undefined
] {
	let major: number;
	let minor: number;
	let micro: number;
	let revision: number;
	let lang: number | undefined;
	if (
		typeof arg1 === 'string' &&
		(typeof arg2 === 'undefined' || typeof arg2 === 'number') &&
		typeof arg3 === 'undefined'
	) {
		[major, minor, micro, revision] = arg1
			.split('.')
			.map((token) => clampInt(Number(token), 0, 65535))
			// add zeros for missing fields
			.concat(0, 0, 0) as [number, number, number, number];
		lang = arg2;
	} else {
		major = clampInt(Number(arg1), 0, 65535);
		minor = clampInt(Number(arg2), 0, 65535);
		micro = clampInt(
			typeof arg3 === 'undefined' ? 0 : Number(arg3),
			0,
			65535
		);
		revision = clampInt(
			typeof arg4 === 'undefined' ? 0 : Number(arg4),
			0,
			65535
		);
		lang = arg5;
	}
	return [major, minor, micro, revision, lang];
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Treats 'Version information' (`VS_VERSIONINFO`) resource data.
 */
export default class VersionInfo {
	private readonly data: VersionEntry;

	private constructor(entry?: Type.ResourceEntry) {
		if (!entry) {
			this.data = {
				lang: 0, // MAKELANGID(LANG_NEUTRAL, SUBLANG_NEUTRAL)
				fixedInfo: createFixedInfo(),
				strings: [],
				translations: [],
				unknowns: [],
			};
		} else {
			const view = new DataView(entry.bin);
			this.data = parseVersionEntry(view, entry);
		}
	}

	/** Returns new `VersionInfo` instance with empty data. */
	public static createEmpty(): VersionInfo {
		return new VersionInfo();
	}

	/**
	 * Returns new `VersionInfo` instance with specified parameters.
	 * `fixedInfo` can be specified as a partial object;
	 * default values (zero) are used for all unspecified field.
	 */
	public static create(
		lang: string | number,
		fixedInfo: Partial<Readonly<VersionFixedInfo>>,
		strings: readonly VersionStringTable[]
	): VersionInfo;
	/** Returns new `VersionInfo` instance with specified parameters. */
	public static create(param: Readonly<VersionInfoCreateParam>): VersionInfo;

	public static create(
		arg1: string | number | Readonly<VersionInfoCreateParam>,
		fixedInfo?: Partial<Readonly<VersionFixedInfo>>,
		strings?: readonly VersionStringTable[]
	): VersionInfo {
		let lang: string | number;
		if (typeof arg1 === 'object') {
			lang = arg1.lang;
			fixedInfo = arg1.fixedInfo;
			strings = arg1.strings;
		} else {
			lang = arg1;
		}
		const vi = new VersionInfo();
		vi.data.lang = lang;
		// copy all specified values
		// (if unspecified, use default value set by `createFixedInfo`)
		for (const _fixedInfoKey in fixedInfo!) {
			const fixedInfoKey = _fixedInfoKey as keyof VersionFixedInfo;
			if (fixedInfoKey in fixedInfo) {
				const value = fixedInfo[fixedInfoKey];
				if (value != null) {
					vi.data.fixedInfo[fixedInfoKey] = value;
				}
			}
		}
		vi.data.strings = strings!.map(
			({ lang, codepage, values }): VersionStringTable => ({
				lang,
				codepage,
				values: cloneObject(values),
			})
		);
		vi.data.translations = strings!.map(
			({ lang, codepage }): VersionTranslation => ({ lang, codepage })
		);
		return vi;
	}

	/** Pick up all version-info entries */
	public static fromEntries(
		entries: readonly Type.ResourceEntry[]
	): VersionInfo[] {
		return entries
			.filter((e) => e.type === 16)
			.map((e) => new VersionInfo(e));
	}

	/** A language value for this resource entry. */
	public get lang(): string | number {
		return this.data.lang;
	}
	public set lang(value: string | number) {
		this.data.lang = value;
	}

	/**
	 * The property of fixed version info, containing file version, product version, etc.
	 * (data: `VS_FIXEDFILEINFO`)
	 *
	 * Although this property is read-only, you can rewrite
	 * each child fields directly to apply data.
	 */
	public get fixedInfo(): VersionFixedInfo {
		return this.data.fixedInfo;
	}

	/**
	 * Returns all languages that the executable supports. (data: `VarFileInfo`)
	 *
	 * Usually the returned array is equal to the one returned by `getAllLanguagesForStringValues`,
	 * but some resource-generating tools doesn't generate same values.
	 */
	public getAvailableLanguages(): VersionTranslation[] {
		return this.data.translations.slice(0);
	}
	/**
	 * Replaces all languages that the executable supports.
	 */
	public replaceAvailableLanguages(
		languages: readonly VersionTranslation[]
	): void {
		this.data.translations = languages.slice(0);
	}

	/**
	 * Returns all string values for the specified language. (data: values in lang-charset block of `StringFileInfo`)
	 */
	public getStringValues(language: VersionTranslation): VersionStringValues {
		const a = this.data.strings
			.filter(
				(e) =>
					e.lang === language.lang && e.codepage === language.codepage
			)
			.map((e) => e.values);
		return a.length > 0 ? a[0]! : {};
	}

	/**
	 * Returns all languages used by string values. (data: lang-charset name of `StringFileInfo`)
	 *
	 * Usually the returned array is equal to the one returned by `getAvailableLanguages`,
	 * but some resource-generating tools doesn't generate same values.
	 */
	public getAllLanguagesForStringValues(): VersionTranslation[] {
		return this.data.strings.map(
			({ codepage, lang }): VersionTranslation => ({ codepage, lang })
		);
	}

	/**
	 * Add or replace the string values.
	 * @param language language info
	 * @param values string values (key-value pairs)
	 * @param addToAvailableLanguage set `true` to add `language` into available languages
	 *     if not existing in `getAvailableLanguages()` (default: `true`)
	 */
	public setStringValues(
		language: VersionTranslation,
		values: VersionStringValues,
		addToAvailableLanguage: boolean = true
	): void {
		const a = this.data.strings.filter(
			(e) => e.lang === language.lang && e.codepage === language.codepage
		);
		let table: VersionStringTable;
		if (a.length === 0) {
			table = {
				lang: language.lang,
				codepage: language.codepage,
				values: {},
			};
			this.data.strings.push(table);
		} else {
			table = a[0]!;
		}
		for (const key in values) {
			const value = values[key];
			if (value != null) {
				table.values[key] = value;
			}
		}

		if (addToAvailableLanguage) {
			// if no translation is available, then add it
			const t = this.data.translations.filter(
				(e) =>
					e.lang === language.lang && e.codepage === language.codepage
			);
			if (t.length === 0) {
				this.data.translations.push({
					lang: language.lang,
					codepage: language.codepage,
				});
			}
		}
	}
	/**
	 * Add or replace the string value.
	 * @param language language info
	 * @param key the key name of string value
	 * @param value the string value
	 * @param addToAvailableLanguage set `true` to add `language` into available languages
	 *     if not existing in `getAvailableLanguages()` (default: `true`)
	 */
	public setStringValue(
		language: VersionTranslation,
		key: string,
		value: string,
		addToAvailableLanguage: boolean = true
	): void {
		this.setStringValues(
			language,
			{ [key]: value },
			addToAvailableLanguage
		);
	}
	/**
	 * Remove all string values for specified language.
	 * @param language language info
	 * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
	 *     if existing in `getAvailableLanguages()` (default: `true`)
	 */
	public removeAllStringValues(
		language: VersionTranslation,
		removeFromAvailableLanguage: boolean = true
	): void {
		const strings = this.data.strings;
		const len = strings.length;
		for (let i = 0; i < len; ++i) {
			const e = strings[i];
			if (
				e != null &&
				e.lang === language.lang &&
				e.codepage === language.codepage
			) {
				strings.splice(i, 1);
				if (removeFromAvailableLanguage) {
					const translations = this.data.translations;
					for (let j = 0; j < translations.length; j++) {
						const t = translations[j];
						if (
							t != null &&
							t.lang === language.lang &&
							t.codepage === language.codepage
						) {
							translations.splice(j, 1);
							break;
						}
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
	 * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
	 *     if no more string values exist for `language` (default: `true`)
	 */
	public removeStringValue(
		language: VersionTranslation,
		key: string,
		removeFromAvailableLanguage: boolean = true
	): void {
		const strings = this.data.strings;
		const len = strings.length;
		for (let i = 0; i < len; ++i) {
			const e = strings[i];
			if (
				e != null &&
				e.lang === language.lang &&
				e.codepage === language.codepage
			) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete e.values[key];
				} catch (_ex) {}
				if (
					removeFromAvailableLanguage &&
					Object.keys(e.values).length === 0
				) {
					// if no entries are left, remove table and translations
					strings.splice(i, 1);
					const translations = this.data.translations;
					for (let j = 0; j < translations.length; j++) {
						const t = translations[j];
						if (
							t != null &&
							t.lang === language.lang &&
							t.codepage === language.codepage
						) {
							translations.splice(j, 1);
							break;
						}
					}
				}
				break;
			}
		}
	}

	/**
	 * Creates `Type.ResourceEntry` object for this instance.
	 * Usually `outputToResourceEntries` is suitable for generating resource data
	 * into executables, but you can use this method if necessary.
	 */
	public generateResource(): Type.ResourceEntry {
		const bin = generateVersionEntryBinary(this.data);

		return {
			type: 16,
			id: 1,
			lang: this.lang,
			codepage: 1200,
			bin,
		};
	}

	/**
	 * Generates version info resource data (using `generateResource()`) and emits into `entries` array.
	 * If version info resource already exists in `entries`, this method replaces it with the new one.
	 * @param entries resource entry array for output
	 */
	public outputToResourceEntries(entries: Type.ResourceEntry[]): void {
		const res = this.generateResource();

		const len = entries.length;
		for (let i = 0; i < len; ++i) {
			const e = entries[i];
			if (
				e != null &&
				e.type === 16 &&
				e.id === res.id &&
				e.lang === res.lang
			) {
				entries[i] = res;
				return;
			}
		}

		entries.push(res);
	}

	// utility methods

	private getDefaultVersionLang(propName: string) {
		// first, use `this.lang` if it is a numeric value
		const num = Number(this.lang);
		if (this.lang !== '' && !isNaN(num)) {
			return num;
		}
		// second, use lang value for propName if there is only one language
		const a = this.data.strings
			.filter((e) => propName in e.values && e.values[propName] != null)
			.map((e) => e.lang);
		if (a.length === 1) {
			return a[0]!;
		}
		// use English language
		return 1033;
	}

	/**
	 * Sets 'FileVersion' property with specified values.
	 * This methods writes `fixedInfo.fileVersionMS` and `fixedInfo.fileVersionLS` fields,
	 * and writes `FileVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
	 * @param major The major version (clamped between 0 and 65535)
	 * @param minor The minor version (clamped between 0 and 65535)
	 * @param micro The micro version (clamped between 0 and 65535; default is 0)
	 * @param revision The revision value (clamped between 0 and 65535; default is 0)
	 * @param lang The language (default: this.lang -> picked from existings -> 1033)
	 * @note
	 * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
	 */
	public setFileVersion(
		major: number,
		minor: number,
		micro?: number,
		revision?: number,
		lang?: number
	): void;
	/**
	 * Sets 'FileVersion' property with specified values.
	 * This methods writes `fixedInfo.fileVersionMS` and `fixedInfo.fileVersionLS` fields,
	 * and writes `FileVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
	 * @param version The version string value (should be `x.x.x.x` format; each integer clamped between 0 and 65535)
	 * @param lang The language (default: this.lang -> picked from existings -> 1033)
	 * @note
	 * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
	 */
	public setFileVersion(version: string, lang?: number): void;

	public setFileVersion(
		arg1: string | number,
		arg2?: number,
		arg3?: number,
		arg4?: number,
		arg5?: number
	): void {
		this.setFileVersionImpl(
			...parseVersionArguments(arg1, arg2, arg3, arg4, arg5)
		);
	}

	private setFileVersionImpl(
		major: number,
		minor: number,
		micro: number,
		revision: number,
		lang?: number
	): void {
		lang =
			typeof lang !== 'undefined'
				? lang
				: this.getDefaultVersionLang('FileVersion');
		this.fixedInfo.fileVersionMS = (major << 16) | minor;
		this.fixedInfo.fileVersionLS = (micro << 16) | revision;
		this.setStringValue(
			{ lang, codepage: 1200 },
			'FileVersion',
			`${major}.${minor}.${micro}.${revision}`,
			true
		);
	}

	/**
	 * Sets 'ProductVersion' property with specified values.
	 * This methods writes `fixedInfo.productVersionMS` and `fixedInfo.productVersionLS` fields,
	 * and writes `ProductVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
	 * @param major The major version (clamped between 0 and 65535)
	 * @param minor The minor version (clamped between 0 and 65535)
	 * @param micro The micro version (clamped between 0 and 65535; default is 0)
	 * @param revision The revision value (clamped between 0 and 65535; default is 0)
	 * @param lang The language (default: this.lang -> picked from existings -> 1033)
	 * @note
	 * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
	 */
	public setProductVersion(
		major: number,
		minor: number,
		micro?: number,
		revision?: number,
		lang?: number
	): void;
	/**
	 * Sets 'ProductVersion' property with specified values.
	 * This methods writes `fixedInfo.productVersionMS` and `fixedInfo.productVersionLS` fields,
	 * and writes `ProductVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
	 * @param version The version string value (should be `x.x.x.x` format; each integer clamped between 0 and 65535)
	 * @param lang The language (default: this.lang -> picked from existings -> 1033)
	 * @note
	 * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
	 */
	public setProductVersion(version: string, lang?: number): void;

	public setProductVersion(
		arg1: string | number,
		arg2?: number,
		arg3?: number,
		arg4?: number,
		arg5?: number
	): void {
		this.setProductVersionImpl(
			...parseVersionArguments(arg1, arg2, arg3, arg4, arg5)
		);
	}

	private setProductVersionImpl(
		major: number,
		minor: number,
		micro: number,
		revision: number,
		lang?: number
	): void {
		lang =
			typeof lang !== 'undefined'
				? lang
				: this.getDefaultVersionLang('ProductVersion');
		this.fixedInfo.productVersionMS = (major << 16) | minor;
		this.fixedInfo.productVersionLS = (micro << 16) | revision;
		this.setStringValue(
			{ lang, codepage: 1200 },
			'ProductVersion',
			`${major}.${minor}.${micro}.${revision}`,
			true
		);
	}
}

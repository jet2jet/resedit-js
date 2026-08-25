import type { NtExecutableResource, Type } from 'pe-library';
import {
	allocatePartialBinary,
	copyBuffer,
	readUint16WithLastOffset,
	readUint32WithLastOffset,
	roundUp,
} from '../util/functions.js';

/*
MUI resource data format:

DWORD signature; // 0xFECDFECD
DWORD size;
DWORD version;   // 0x00010000
DWORD reserved1;
DWORD fileType; // (fileType & 0x0F): 1 for LN, 2 for mui ; ((fileType & 0xF0) >> 4): 1 for 'system', 2 for 'application'
DWORD systemAttributes; // some system program have 0x100
DWORD ultimateFallbackLocation; // 1: internal, 2: external; 0 for mui
// Following checksums are noted in: https://learn.microsoft.com/en-us/windows/win32/intl/mui-resource-management#features-of-the-mui-resource-technology
// But in actual operation, these checksums can be any values
BYTE checksumMain[16];    // document says 'calculated from the major and minor version numbers of a file and the file name (case sensitive), which are obtained from the version resource'
BYTE checksumService[16]; // document says 'calculated based on the localizable resources in the file'
DWORD reserved2[6];
DWORD mainNameTypesOffset;
DWORD mainNameTypesLength;
DWORD mainIDTypesOffset;
DWORD mainIDTypesLength;
DWORD muiNameTypesOffset; // 0 for mui
DWORD muiNameTypesLength; // 0 for mui
DWORD muiIDTypesOffset; // 0 for mui
DWORD muiIDTypesLength; // 0 for mui
DWORD languageOffset; // 0 for LN
DWORD languageLength; // 0 for LN
DWORD ultimateFallbackLanguageOffset; // 0 for mui
DWORD ultimateFallbackLanguageLength; // 0 for mui
// DWORD paddingFor64bitAlignment[];

// mainNameTypes: <double-null-char-terminated (two null chars must follow) UTF-16LE string> + two extra null chars
// mainIDTypes: DWORD array
// muiNameTypes: <double-null-char-terminated (two null chars must follow) UTF-16LE string> + two extra null chars
// muiIDTypes: DWORD array
// language/ultimateFallbackLanguage: null-char-terminated UTF-16LE string
*/

export interface MuiResourceData {
	/**
	 * The language value (`1033` for en-US) for MUI resource entry itself (equal to `ResourceEntry.lang`).
	 * This value is not used to load language-specific MUI resource ({@linkcode language} is used for its purpose).
	 */
	resLang: string | number;
	/** An boolean value whether this data is for LN binary */
	isLn: boolean;
	/** The file type for LN/MUI binaries. For regular executables, specify `'application'`. */
	fileType: 'application' | 'system';
	/** Used by the system. For regular executables, specify 0. */
	systemAttributes: number;
	/**
	 * Checksum value (binary) to distuinguish the build (version and etc.) for executables.
	 * `checksumMain` must be equal to each executables (including LN and MUIs), and
	 * must be changed if the version or etc. is changed.
	 */
	checksumMain: Uint8Array;
	/**
	 * Checksum value (binary) to distuinguish the resource data for executables.
	 * `checksumService` must be equal to each executables (including LN and MUIs), and
	 * should be changed if resource entries are added or removed.
	 */
	checksumService: Uint8Array;
	/**
	 * The language tag (`'en-US'` or etc.) representing which language of resource data the MUI binary has.
	 * This will be an empty string (ignored) for LN binary.
	 */
	language: string;
	/**
	 * The fallback language tag (`'en-US'` or etc.), used when the resource data for preferred language is not found.
	 * This will be an empty string (ignored) for MUI binary.
	 */
	ultimateFallbackLanguage: string;
	/**
	 * Specifies the location to use fallback resource data from, used when the resource data for preferred language is not found.
	 * Ignored for MUI binary.
	 * - `'internal'` - use resource data stored in the LN binary
	 * - `'external'` - use resource data in the MUI binary (uses `ultimateFallbackLanguage`)
	 */
	ultimateFallbackLocation: 'internal' | 'external';
	/** Neutral (language-independent) resource types. Numeric values are predefined resource types such as String Table (value: 6). */
	mainTypes: Array<string | number>;
	/** Language-specific resource types. Numeric values are predefined resource types such as String Table (value: 6). */
	muiTypes: Array<string | number>;
}

function isValidMuiResourceEntry(resourceEntry: Type.ResourceEntry): boolean {
	const view = new DataView(resourceEntry.bin);
	if (view.getUint32(0, true) !== 0xfecdfecd) {
		return false;
	}
	const len = view.getUint32(4, true);
	if (len !== resourceEntry.bin.byteLength) {
		return false;
	}
	const version = view.getUint32(8, true);
	// Currently only 0x00010000 is supported
	if (version !== 0x00010000) {
		return false;
	}
	const fileType = view.getUint32(16, true);
	// The lower 4-bit is the role type (neutral: 1 or specific: 2)
	if ((fileType & 0x0f) !== 1 && (fileType & 0x0f) !== 2) {
		return false;
	}
	return true;
}

function parseMuiResourceData(
	resourceEntry: Type.ResourceEntry
): MuiResourceData {
	const view = new DataView(resourceEntry.bin);
	const len = view.getUint32(4, true);
	const fileTypeNum = readUint32WithLastOffset(view, 16, len) & 0xf0;
	const fileType = fileTypeNum === 0x10 ? 'system' : 'application';
	const isLn = (fileTypeNum & 0x0f) !== 2;
	const systemAttributes = readUint32WithLastOffset(view, 20, len);
	const ultimateFallbackLocationNum = readUint32WithLastOffset(view, 24, len);
	const ultimateFallbackLocation =
		ultimateFallbackLocationNum === 2 ? 'external' : 'internal';
	const checksumMain = new Uint8Array(
		allocatePartialBinary(resourceEntry.bin, 28, 16)
	);
	const checksumService = new Uint8Array(
		allocatePartialBinary(resourceEntry.bin, 44, 16)
	);
	const mainNameTypesOffset = readUint32WithLastOffset(view, 84, len);
	const mainNameTypesLength = readUint32WithLastOffset(view, 88, len);
	const mainIDTypesOffset = readUint32WithLastOffset(view, 92, len);
	const mainIDTypesLength = readUint32WithLastOffset(view, 96, len);
	const muiNameTypesOffset = readUint32WithLastOffset(view, 100, len);
	const muiNameTypesLength = readUint32WithLastOffset(view, 104, len);
	const muiIDTypesOffset = readUint32WithLastOffset(view, 108, len);
	const muiIDTypesLength = readUint32WithLastOffset(view, 112, len);
	const languageOffset = readUint32WithLastOffset(view, 116, len);
	const languageLength = readUint32WithLastOffset(view, 120, len);
	const ultimateFallbackLanguageOffset = readUint32WithLastOffset(
		view,
		124,
		len
	);
	const ultimateFallbackLanguageLength = readUint32WithLastOffset(
		view,
		128,
		len
	);

	let o: number;
	let e: number;
	let s: string = '';

	const mainTypes: Array<string | number> = [];
	for (
		o = mainNameTypesOffset, e = mainNameTypesOffset + mainNameTypesLength;
		o < e;
		o += 2
	) {
		const char = readUint16WithLastOffset(view, o, len);
		if (char === 0) {
			if (o > mainNameTypesOffset && s === '') {
				break;
			}
			mainTypes.push(s);
			s = '';
		} else {
			s += String.fromCharCode(char);
		}
	}
	if (s !== '') {
		mainTypes.push(s);
	}
	for (
		o = mainIDTypesOffset, e = mainIDTypesOffset + mainIDTypesLength;
		o < e;
		o += 4
	) {
		const t = readUint32WithLastOffset(view, o, len);
		if (t > 0) {
			mainTypes.push(t);
		}
	}

	const muiTypes: Array<string | number> = [];
	for (
		s = '',
			o = muiNameTypesOffset,
			e = muiNameTypesOffset + muiNameTypesLength;
		o < e;
		o += 2
	) {
		const char = readUint16WithLastOffset(view, o, len);
		if (char === 0) {
			if (o > muiNameTypesOffset && s === '') {
				break;
			}
			muiTypes.push(s);
			s = '';
		} else {
			s += String.fromCharCode(char);
		}
	}
	if (s !== '') {
		muiTypes.push(s);
	}
	for (
		o = muiIDTypesOffset, e = muiIDTypesOffset + muiIDTypesLength;
		o < e;
		o += 4
	) {
		const t = readUint32WithLastOffset(view, o, len);
		if (t > 0) {
			muiTypes.push(t);
		}
	}

	for (
		s = '', o = languageOffset, e = languageOffset + languageLength;
		o < e;
		o += 2
	) {
		const char = readUint16WithLastOffset(view, o, len);
		if (char === 0) {
			break;
		}
		s += String.fromCharCode(char);
	}
	const language = s;

	for (
		s = '',
			o = ultimateFallbackLanguageOffset,
			e = ultimateFallbackLanguageOffset + ultimateFallbackLanguageLength;
		o < e;
		o += 2
	) {
		const char = readUint16WithLastOffset(view, o, len);
		if (char === 0) {
			break;
		}
		s += String.fromCharCode(char);
	}
	const ultimateFallbackLanguage = s;

	return {
		resLang: resourceEntry.lang,
		isLn,
		fileType,
		systemAttributes,
		checksumMain,
		checksumService,
		language,
		ultimateFallbackLanguage,
		ultimateFallbackLocation,
		mainTypes,
		muiTypes,
	};
}

function generateMuiResourceData(data: MuiResourceData): Type.ResourceEntry {
	let binaryLength = 136; // 132 + padding for 8-byte alignment
	let mainNameTypesOffset = 0;
	let mainNameTypesLength = 0;
	let mainIDTypesOffset = 0;
	let mainIDTypesLength = 0;
	let muiNameTypesOffset = 0;
	let muiNameTypesLength = 0;
	let muiIDTypesOffset = 0;
	let muiIDTypesLength = 0;
	let languageOffset = 0;
	let languageLength = 0;
	let ultimateFallbackLanguageOffset = 0;
	let ultimateFallbackLanguageLength = 0;
	data.mainTypes.forEach((type) => {
		if (typeof type === 'number') {
			mainIDTypesLength += 4;
		} else {
			mainNameTypesLength += (type.length + 1) * 2;
		}
	});
	if (mainNameTypesLength > 0) {
		mainNameTypesLength += 6; // last null char and two extra null chars
	}
	data.muiTypes.forEach((type) => {
		if (typeof type === 'number') {
			muiIDTypesLength += 4;
		} else {
			muiNameTypesLength += (type.length + 1) * 2;
		}
	});
	if (muiNameTypesLength > 0) {
		muiNameTypesLength += 6; // last null char and two extra null chars
	}

	if (data.isLn) {
		if (data.ultimateFallbackLocation === 'external') {
			ultimateFallbackLanguageLength =
				(data.ultimateFallbackLanguage.length + 1) * 2;
		}
	} else {
		languageLength = (data.language.length + 1) * 2;
	}

	if (mainNameTypesLength > 0) {
		mainNameTypesOffset = binaryLength;
		binaryLength += roundUp(mainNameTypesLength, 8);
	}
	if (mainIDTypesLength > 0) {
		mainIDTypesOffset = binaryLength;
		binaryLength += roundUp(mainIDTypesLength, 8);
	}
	if (muiNameTypesLength > 0) {
		muiNameTypesOffset = binaryLength;
		binaryLength += roundUp(muiNameTypesLength, 8);
	}
	if (muiIDTypesLength > 0) {
		muiIDTypesOffset = binaryLength;
		binaryLength += roundUp(muiIDTypesLength, 8);
	}
	if (languageLength > 0) {
		languageOffset = binaryLength;
		binaryLength += roundUp(languageLength, 8);
	}
	if (ultimateFallbackLanguageLength > 0) {
		ultimateFallbackLanguageOffset = binaryLength;
		binaryLength += roundUp(ultimateFallbackLanguageLength, 8);
	}

	const bin = new ArrayBuffer(binaryLength);
	const view = new DataView(bin);
	view.setUint32(0, 0xfecdfecd, true);
	view.setUint32(4, binaryLength, true);
	view.setUint32(8, 0x00010000, true);
	view.setUint32(
		16,
		((data.fileType === 'system' ? 1 : 2) << 4) + (data.isLn ? 1 : 2),
		true
	);
	view.setUint32(20, data.systemAttributes, true);
	view.setUint32(
		24,
		data.isLn ? (data.ultimateFallbackLocation === 'internal' ? 1 : 2) : 0,
		true
	);
	copyBuffer(
		bin,
		28,
		data.checksumMain,
		0,
		data.checksumMain.length < 16 ? data.checksumMain.length : 16
	);
	copyBuffer(
		bin,
		44,
		data.checksumService,
		0,
		data.checksumService.length < 16 ? data.checksumService.length : 16
	);
	view.setUint32(84, mainNameTypesOffset, true);
	view.setUint32(88, mainNameTypesLength, true);
	view.setUint32(92, mainIDTypesOffset, true);
	view.setUint32(96, mainIDTypesLength, true);
	view.setUint32(100, muiNameTypesOffset, true);
	view.setUint32(104, muiNameTypesLength, true);
	view.setUint32(108, muiIDTypesOffset, true);
	view.setUint32(112, muiIDTypesLength, true);
	view.setUint32(116, languageOffset, true);
	view.setUint32(120, languageLength, true);
	view.setUint32(124, ultimateFallbackLanguageOffset, true);
	view.setUint32(128, ultimateFallbackLanguageLength, true);

	let offset = 136;
	if (mainNameTypesLength > 0) {
		data.mainTypes.forEach((type) => {
			if (typeof type !== 'number') {
				for (let i = 0; i < type.length; ++i) {
					view.setUint16(offset, type.charCodeAt(i), true);
					offset += 2;
				}
				offset += 2;
			}
		});
		offset += 6; // last null char and two extra null chars
		offset = roundUp(offset, 8);
	}
	if (mainIDTypesLength > 0) {
		data.mainTypes.forEach((type) => {
			if (typeof type === 'number') {
				view.setUint32(offset, type, true);
				offset += 4;
			}
		});
		offset = roundUp(offset, 8);
	}
	if (muiNameTypesLength > 0) {
		data.muiTypes.forEach((type) => {
			if (typeof type !== 'number') {
				for (let i = 0; i < type.length; ++i) {
					view.setUint16(offset, type.charCodeAt(i), true);
					offset += 2;
				}
				offset += 2;
			}
		});
		offset += 6; // last null char and two extra null chars
		offset = roundUp(offset, 8);
	}
	if (muiIDTypesLength > 0) {
		data.muiTypes.forEach((type) => {
			if (typeof type === 'number') {
				view.setUint32(offset, type, true);
				offset += 4;
			}
		});
		offset = roundUp(offset, 8);
	}
	if (languageLength > 0) {
		for (let i = 0; i < data.language.length; ++i) {
			view.setUint16(offset, data.language.charCodeAt(i), true);
			offset += 2;
		}
		offset += 2;
		offset = roundUp(offset, 8);
	}
	if (ultimateFallbackLanguageLength > 0) {
		for (let i = 0; i < data.ultimateFallbackLanguage.length; ++i) {
			view.setUint16(
				offset,
				data.ultimateFallbackLanguage.charCodeAt(i),
				true
			);
			offset += 2;
		}
		offset += 2;
		offset = roundUp(offset, 8);
	}

	return {
		type: 'MUI',
		id: 1,
		lang: data.resLang,
		codepage: 1200,
		bin,
	};
}

export default class MuiResourceInfo {
	/** MUI resource data. `null` means no data (remove MUI resource on generating) */
	public data: MuiResourceData | null;

	private constructor(_data: MuiResourceData | null) {
		this.data = _data;
	}

	/**
	 * Parses an executable with resource.
	 * @param executableResource `NtExecutableResource` instance for the LN or MUI executable (retrieved/created via `NtExecutableResource.from`)
	 * @returns `MuiResourceInfo` instance to treat the MUI resource
	 */
	public static from(
		executableResource: NtExecutableResource
	): MuiResourceInfo {
		let muiResourceData: MuiResourceData | null = null;
		try {
			executableResource.entries.forEach((entry) => {
				if (muiResourceData != null) {
					return;
				}
				if (entry.type === 'MUI' && isValidMuiResourceEntry(entry)) {
					muiResourceData = parseMuiResourceData(entry);
				}
			});
		} catch {
			// ignore if resource is not found
		}
		return new MuiResourceInfo(muiResourceData);
	}

	/**
	 * Creates the new `MuiResourceInfo` instance with empty data.
	 * This is useful for creating MUI resource data by scratch.
	 */
	public static createEmpty(): MuiResourceInfo {
		return new MuiResourceInfo(null);
	}

	/**
	 * Generates resource data from current data.
	 * Non-null returned values can be stored to `NtExecutableResource.entries`.
	 */
	public generateEntry(): Type.ResourceEntry | null {
		return this.data == null ? null : generateMuiResourceData(this.data);
	}

	/**
	 * Replace an MUI entry for `NtExecutableResource` with containing resource data (generated by {@linkcode generateEntry}).
	 * All MUI entries are replaced; if `generateEntry` returns null entry, or the resource data for specified MUI executable is not found,
	 * MUI entries for the executable will be removed.
	 * @param targetExecutableResource `NtExecutableResource` instance
	 */
	public replaceMuiEntryForExecutables(
		targetExecutableResource: NtExecutableResource
	): void {
		const generated = this.generateEntry();
		{
			let found = false;
			for (
				let i = targetExecutableResource.entries.length - 1;
				i >= 0;
				--i
			) {
				const entry = targetExecutableResource.entries[i]!;
				if (entry.type === 'MUI') {
					// Remove duplicate resources if already found
					if (found || generated == null) {
						targetExecutableResource.entries.splice(i, 1);
					} else {
						targetExecutableResource.entries[i] = generated;
					}
					found = true;
				}
			}
			if (!found && generated != null) {
				targetExecutableResource.entries.unshift(generated);
			}
		}
	}
}

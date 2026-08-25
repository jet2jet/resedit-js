import { NtExecutable, NtExecutableResource, type Type } from 'pe-library';
import VersionInfo from '../resource/VersionInfo.js';
import { cloneToArrayBuffer } from '../util/functions.js';
import MuiResourceInfo from './MuiResourceInfo.js';

/** The record of known LANGID (each numeric key is LANGID) and the language tag */
export const langIdToLanguageTagMap: Record<number, string> = {
	// List is from https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/63d3d639-7fd2-4afb-abbe-0d5b5551eef8
	0x0001: 'ar',
	0x0002: 'bg',
	0x0003: 'ca',
	0x0004: 'zh-Hans',
	0x0005: 'cs',
	0x0006: 'da',
	0x0007: 'de',
	0x0008: 'el',
	0x0009: 'en',
	0x000a: 'es',
	0x000b: 'fi',
	0x000c: 'fr',
	0x000d: 'he',
	0x000e: 'hu',
	0x000f: 'is',
	0x0010: 'it',
	0x0011: 'ja',
	0x0012: 'ko',
	0x0013: 'nl',
	0x0014: 'no',
	0x0015: 'pl',
	0x0016: 'pt',
	0x0017: 'rm',
	0x0018: 'ro',
	0x0019: 'ru',
	0x001a: 'hr',
	0x001b: 'sk',
	0x001c: 'sq',
	0x001d: 'sv',
	0x001e: 'th',
	0x001f: 'tr',
	0x0020: 'ur',
	0x0021: 'id',
	0x0022: 'uk',
	0x0023: 'be',
	0x0024: 'sl',
	0x0025: 'et',
	0x0026: 'lv',
	0x0027: 'lt',
	0x0028: 'tg',
	0x0029: 'fa',
	0x002a: 'vi',
	0x002b: 'hy',
	0x002c: 'az',
	0x002d: 'eu',
	0x002e: 'hsb',
	0x002f: 'mk',
	0x0030: 'st',
	0x0031: 'ts',
	0x0032: 'tn',
	0x0033: 've',
	0x0034: 'xh',
	0x0035: 'zu',
	0x0036: 'af',
	0x0037: 'ka',
	0x0038: 'fo',
	0x0039: 'hi',
	0x003a: 'mt',
	0x003b: 'se',
	0x003c: 'ga',
	0x003d: 'yi',
	0x003e: 'ms',
	0x003f: 'kk',
	0x0040: 'ky',
	0x0041: 'sw',
	0x0042: 'tk',
	0x0043: 'uz',
	0x0044: 'tt',
	0x0045: 'bn',
	0x0046: 'pa',
	0x0047: 'gu',
	0x0048: 'or',
	0x0049: 'ta',
	0x004a: 'te',
	0x004b: 'kn',
	0x004c: 'ml',
	0x004d: 'as',
	0x004e: 'mr',
	0x004f: 'sa',
	0x0050: 'mn',
	0x0051: 'bo',
	0x0052: 'cy',
	0x0053: 'km',
	0x0054: 'lo',
	0x0055: 'my',
	0x0056: 'gl',
	0x0057: 'kok',
	0x0058: 'mni',
	0x0059: 'sd',
	0x005a: 'syr',
	0x005b: 'si',
	0x005c: 'chr',
	0x005d: 'iu',
	0x005e: 'am',
	0x005f: 'tzm',
	0x0060: 'ks',
	0x0061: 'ne',
	0x0062: 'fy',
	0x0063: 'ps',
	0x0064: 'fil',
	0x0065: 'dv',
	0x0066: 'bin',
	0x0067: 'ff',
	0x0068: 'ha',
	0x0069: 'ibb',
	0x006a: 'yo',
	0x006b: 'quz',
	0x006c: 'nso',
	0x006d: 'ba',
	0x006e: 'lb',
	0x006f: 'kl',
	0x0070: 'ig',
	0x0071: 'kr',
	0x0072: 'om',
	0x0073: 'ti',
	0x0074: 'gn',
	0x0075: 'haw',
	0x0076: 'la',
	0x0077: 'so',
	0x0078: 'ii',
	0x0079: 'pap',
	0x007a: 'arn',
	0x007c: 'moh',
	0x007e: 'br',
	0x0080: 'ug',
	0x0081: 'mi',
	0x0082: 'oc',
	0x0083: 'co',
	0x0084: 'gsw',
	0x0085: 'sah',
	0x0086: 'qut',
	0x0087: 'rw',
	0x0088: 'wo',
	0x008c: 'prs',
	0x0091: 'gd',
	0x0092: 'ku',
	0x0093: 'quc',
	0x0401: 'ar-SA',
	0x0402: 'bg-BG',
	0x0403: 'ca-ES',
	0x0404: 'zh-TW',
	0x0405: 'cs-CZ',
	0x0406: 'da-DK',
	0x0407: 'de-DE',
	0x0408: 'el-GR',
	0x0409: 'en-US',
	0x040a: 'es-ES_tradnl',
	0x040b: 'fi-FI',
	0x040c: 'fr-FR',
	0x040d: 'he-IL',
	0x040e: 'hu-HU',
	0x040f: 'is-IS',
	0x0410: 'it-IT',
	0x0411: 'ja-JP',
	0x0412: 'ko-KR',
	0x0413: 'nl-NL',
	0x0414: 'nb-NO',
	0x0415: 'pl-PL',
	0x0416: 'pt-BR',
	0x0417: 'rm-CH',
	0x0418: 'ro-RO',
	0x0419: 'ru-RU',
	0x041a: 'hr-HR',
	0x041b: 'sk-SK',
	0x041c: 'sq-AL',
	0x041d: 'sv-SE',
	0x041e: 'th-TH',
	0x041f: 'tr-TR',
	0x0420: 'ur-PK',
	0x0421: 'id-ID',
	0x0422: 'uk-UA',
	0x0423: 'be-BY',
	0x0424: 'sl-SI',
	0x0425: 'et-EE',
	0x0426: 'lv-LV',
	0x0427: 'lt-LT',
	0x0428: 'tg-Cyrl-TJ',
	0x0429: 'fa-IR',
	0x042a: 'vi-VN',
	0x042b: 'hy-AM',
	0x042c: 'az-Latn-AZ',
	0x042d: 'eu-ES',
	0x042e: 'hsb-DE',
	0x042f: 'mk-MK',
	0x0430: 'st-ZA',
	0x0431: 'ts-ZA',
	0x0432: 'tn-ZA',
	0x0433: 've-ZA',
	0x0434: 'xh-ZA',
	0x0435: 'zu-ZA',
	0x0436: 'af-ZA',
	0x0437: 'ka-GE',
	0x0438: 'fo-FO',
	0x0439: 'hi-IN',
	0x043a: 'mt-MT',
	0x043b: 'se-NO',
	0x043d: 'yi-001',
	0x043e: 'ms-MY',
	0x043f: 'kk-KZ',
	0x0440: 'ky-KG',
	0x0441: 'sw-KE',
	0x0442: 'tk-TM',
	0x0443: 'uz-Latn-UZ',
	0x0444: 'tt-RU',
	0x0445: 'bn-IN',
	0x0446: 'pa-IN',
	0x0447: 'gu-IN',
	0x0448: 'or-IN',
	0x0449: 'ta-IN',
	0x044a: 'te-IN',
	0x044b: 'kn-IN',
	0x044c: 'ml-IN',
	0x044d: 'as-IN',
	0x044e: 'mr-IN',
	0x044f: 'sa-IN',
	0x0450: 'mn-MN',
	0x0451: 'bo-CN',
	0x0452: 'cy-GB',
	0x0453: 'km-KH',
	0x0454: 'lo-LA',
	0x0455: 'my-MM',
	0x0456: 'gl-ES',
	0x0457: 'kok-IN',
	0x0458: 'mni-IN',
	0x0459: 'sd-Deva-IN',
	0x045a: 'syr-SY',
	0x045b: 'si-LK',
	0x045c: 'chr-Cher-US',
	0x045d: 'iu-Cans-CA',
	0x045e: 'am-ET',
	0x045f: 'tzm-Arab-MA',
	0x0460: 'ks-Arab',
	0x0461: 'ne-NP',
	0x0462: 'fy-NL',
	0x0463: 'ps-AF',
	0x0464: 'fil-PH',
	0x0465: 'dv-MV',
	0x0466: 'bin-NG',
	0x0468: 'ha-Latn-NG',
	0x0469: 'ibb-NG',
	0x046a: 'yo-NG',
	0x046b: 'quz-BO',
	0x046c: 'nso-ZA',
	0x046d: 'ba-RU',
	0x046e: 'lb-LU',
	0x046f: 'kl-GL',
	0x0470: 'ig-NG',
	0x0471: 'kr-Latn-NG',
	0x0472: 'om-ET',
	0x0473: 'ti-ET',
	0x0474: 'gn-PY',
	0x0475: 'haw-US',
	0x0476: 'la-VA',
	0x0477: 'so-SO',
	0x0478: 'ii-CN',
	0x0479: 'pap-029',
	0x047a: 'arn-CL',
	0x047c: 'moh-CA',
	0x047e: 'br-FR',
	0x0480: 'ug-CN',
	0x0481: 'mi-NZ',
	0x0482: 'oc-FR',
	0x0483: 'co-FR',
	0x0484: 'gsw-FR',
	0x0485: 'sah-RU',
	0x0486: 'qut-GT',
	0x0487: 'rw-RW',
	0x0488: 'wo-SN',
	0x048c: 'prs-AF',
	0x048d: 'plt-MG',
	0x048e: 'zh-yue-HK',
	0x048f: 'tdd-Tale-CN',
	0x0490: 'khb-Talu-CN',
	0x0491: 'gd-GB',
	0x0492: 'ku-Arab-IQ',
	0x0493: 'quc-CO',
	0x0501: 'qps-ploc',
	0x05fe: 'qps-ploca',
	0x0801: 'ar-IQ',
	0x0803: 'ca-ES-valencia',
	0x0804: 'zh-CN',
	0x0807: 'de-CH',
	0x0809: 'en-GB',
	0x080a: 'es-MX',
	0x080c: 'fr-BE',
	0x0810: 'it-CH',
	0x0811: 'ja-Ploc-JP',
	0x0813: 'nl-BE',
	0x0814: 'nn-NO',
	0x0816: 'pt-PT',
	0x0818: 'ro-MD',
	0x0819: 'ru-MD',
	0x081a: 'sr-Latn-CS',
	0x081d: 'sv-FI',
	0x0820: 'ur-IN',
	0x082c: 'az-Cyrl-AZ',
	0x082e: 'dsb-DE',
	0x0832: 'tn-BW',
	0x083b: 'se-SE',
	0x083c: 'ga-IE',
	0x083e: 'ms-BN',
	0x083f: 'kk-Latn-KZ',
	0x0843: 'uz-Cyrl-UZ',
	0x0845: 'bn-BD',
	0x0846: 'pa-Arab-PK',
	0x0849: 'ta-LK',
	0x0850: 'mn-Mong-CN',
	0x0851: 'bo-BT',
	0x0859: 'sd-Arab-PK',
	0x085d: 'iu-Latn-CA',
	0x085f: 'tzm-Latn-DZ',
	0x0860: 'ks-Deva-IN',
	0x0861: 'ne-IN',
	0x0867: 'ff-Latn-SN',
	0x086b: 'quz-EC',
	0x0873: 'ti-ER',
	0x09ff: 'qps-plocm',
	0x0c01: 'ar-EG',
	0x0c04: 'zh-HK',
	0x0c07: 'de-AT',
	0x0c09: 'en-AU',
	0x0c0a: 'es-ES',
	0x0c0c: 'fr-CA',
	0x0c1a: 'sr-Cyrl-CS',
	0x0c3b: 'se-FI',
	0x0c50: 'mn-Mong-MN',
	0x0c51: 'dz-BT',
	0x0c5f: 'tmz-MA',
	0x0c6b: 'quz-PE',
	0x1001: 'ar-LY',
	0x1004: 'zh-SG',
	0x1007: 'de-LU',
	0x1009: 'en-CA',
	0x100a: 'es-GT',
	0x100c: 'fr-CH',
	0x101a: 'hr-BA',
	0x103b: 'smj-NO',
	0x105f: 'tzm-Tfng-MA',
	0x1401: 'ar-DZ',
	0x1404: 'zh-MO',
	0x1407: 'de-LI',
	0x1409: 'en-NZ',
	0x140a: 'es-CR',
	0x140c: 'fr-LU',
	0x141a: 'bs-Latn-BA',
	0x143b: 'smj-SE',
	0x1801: 'ar-MA',
	0x1809: 'en-IE',
	0x180a: 'es-PA',
	0x180c: 'fr-MC',
	0x181a: 'sr-Latn-BA',
	0x183b: 'sma-NO',
	0x1c01: 'ar-TN',
	0x1c09: 'en-ZA',
	0x1c0a: 'es-DO',
	0x1c0c: 'fr-029',
	0x1c1a: 'sr-Cyrl-BA',
	0x1c3b: 'sma-SE',
	0x2001: 'ar-OM',
	0x2009: 'en-JM',
	0x200a: 'es-VE',
	0x200c: 'fr-RE',
	0x201a: 'bs-Cyrl-BA',
	0x203b: 'sms-FI',
	0x2401: 'ar-YE',
	0x2409: 'en-029',
	0x240a: 'es-CO',
	0x240c: 'fr-CD',
	0x241a: 'sr-Latn-RS',
	0x243b: 'smn-FI',
	0x2801: 'ar-SY',
	0x2809: 'en-BZ',
	0x280a: 'es-PE',
	0x280c: 'fr-SN',
	0x281a: 'sr-Cyrl-RS',
	0x2c01: 'ar-JO',
	0x2c09: 'en-TT',
	0x2c0a: 'es-AR',
	0x2c0c: 'fr-CM',
	0x2c1a: 'sr-Latn-ME',
	0x3001: 'ar-LB',
	0x3009: 'en-ZW',
	0x300a: 'es-EC',
	0x300c: 'fr-CI',
	0x301a: 'sr-Cyrl-ME',
	0x3401: 'ar-KW',
	0x3409: 'en-PH',
	0x340a: 'es-CL',
	0x340c: 'fr-ML',
	0x3801: 'ar-AE',
	0x3809: 'en-ID',
	0x380a: 'es-UY',
	0x380c: 'fr-MA',
	0x3c01: 'ar-BH',
	0x3c09: 'en-HK',
	0x3c0a: 'es-PY',
	0x3c0c: 'fr-HT',
	0x4001: 'ar-QA',
	0x4009: 'en-IN',
	0x400a: 'es-BO',
	0x4401: 'ar-Ploc-SA',
	0x4409: 'en-MY',
	0x440a: 'es-SV',
	0x4801: 'ar-145',
	0x4809: 'en-SG',
	0x480a: 'es-HN',
	0x4c09: 'en-AE',
	0x4c0a: 'es-NI',
	0x5009: 'en-BH',
	0x500a: 'es-PR',
	0x5409: 'en-EG',
	0x540a: 'es-US',
	0x5809: 'en-JO',
	0x580a: 'es-419',
	0x5c09: 'en-KW',
	0x5c0a: 'es-CU',
	0x6009: 'en-TR',
	0x6409: 'en-YE',
	0x641a: 'bs-Cyrl',
	0x681a: 'bs-Latn',
	0x6c1a: 'sr-Cyrl',
	0x701a: 'sr-Latn',
	0x703b: 'smn',
	0x742c: 'az-Cyrl',
	0x743b: 'sms',
	0x7804: 'zh',
	0x7814: 'nn',
	0x781a: 'bs',
	0x782c: 'az-Latn',
	0x783b: 'sma',
	0x783f: 'kk-Cyrl',
	0x7843: 'uz-Cyrl',
	0x7850: 'mn-Cyrl',
	0x785d: 'iu-Cans',
	0x785f: 'tzm-Tfng',
	0x7c04: 'zh-Hant',
	0x7c14: 'nb',
	0x7c1a: 'sr',
	0x7c28: 'tg-Cyrl',
	0x7c2e: 'dsb',
	0x7c3b: 'smj',
	0x7c3f: 'kk-Latn',
	0x7c43: 'uz-Latn',
	0x7c46: 'pa-Arab',
	0x7c50: 'mn-Mong',
	0x7c59: 'sd-Arab',
	0x7c5c: 'chr-Cher',
	0x7c5d: 'iu-Latn',
	0x7c5f: 'tzm-Latn',
	0x7c67: 'ff-Latn',
	0x7c68: 'ha-Latn',
	0x7c92: 'ku-Arab',
	0xe40c: 'fr-015',
};

/**
 * Converts LANGID value to known language tag.
 * The language tag is used for `language` of {@linkcode MuiResourceData}, and the directory name which contains localized MUI executable.
 */
export function langIdToLanguageTag(langId: number): string {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	return langIdToLanguageTagMap[langId] || `#${langId}`;
}

/**
 * Generates checksum binary for MUI.
 * This function simply generates random 16-byte binary without reproducibility, since
 * Windows does not check whether the checksum value itself is valid.
 * - For generating the new LN and MUI resources, you can use this function twice,
 *   for main checksum and for service checksum, and set them.
 * - For editing existing LN and MUI resources, you should use this function only if:
 *   - the file name or the version is changed : main checksum should be rewrited.
 *   - the resource entries are added/removed, or the meaning of the resource is changed : service checksum should be rewrited.
 *
 *   If none of above condition is met, you should not rewrite checksums.
 */
export function createChecksumBinary(): Uint8Array {
	const r = new Uint8Array(16);
	for (let i = 0; i < 16; ++i) {
		r[i] = Math.floor(Math.random() * 256);
	}
	return r;
}

function cloneResourceEntry(entry: Type.ResourceEntry): Type.ResourceEntry {
	return {
		type: entry.type,
		id: entry.id,
		lang: entry.lang,
		codepage: entry.codepage,
		bin: cloneToArrayBuffer(entry.bin),
	};
}

function cloneResourceEntryWithLangIdAndReplaceVersionData(
	entry: Type.ResourceEntry,
	langId: number
): Type.ResourceEntry {
	if (entry.type !== 16) {
		const e = cloneResourceEntry(entry);
		e.lang = langId;
		return e;
	}
	// For version resource, langId values inside the version resource should be replaced
	const versionInfoBase = VersionInfo.fromEntries([entry])[0]!;
	// pick first language (it should be equal to `langId`)
	const versionTranslation =
		versionInfoBase.getAllLanguagesForStringValues()[0];
	if (versionTranslation == null) {
		const e = cloneResourceEntry(entry);
		e.lang = langId;
		return e;
	}
	const stringValues = versionInfoBase.getStringValues(versionTranslation);
	// if (stringValues.FileVersion != null) {
	// 	stringValues.FileVersion = '';
	// }
	// if (stringValues.ProductVersion != null) {
	// 	stringValues.ProductVersion = '';
	// }
	const newVersionInfo = VersionInfo.create(
		langId,
		versionInfoBase.fixedInfo,
		[
			{
				lang: langId,
				codepage: 1200,
				values: stringValues,
			},
		]
	);
	return newVersionInfo.generateResource();
}

/**
 * Makes the new MUI resource data for MUI (localized) binary from existing LN (neutral) binary.
 * @param neutralMuiResource An MUI resource data ({@linkcode MuiResourceInfo}) for LN binary
 * @param langTag The language tag (e.g. `'en-US'`) for the return value
 * @returns new `MuiResourceInfo` instance
 */
export function makeLocalizedMuiResourceFromNeutralMuiResource(
	neutralMuiResource: MuiResourceInfo,
	langTag: string
): MuiResourceInfo {
	const result = MuiResourceInfo.createEmpty();
	if (neutralMuiResource.data != null) {
		result.data = {
			resLang: neutralMuiResource.data.resLang,
			isLn: false,
			fileType: neutralMuiResource.data.fileType,
			systemAttributes: neutralMuiResource.data.systemAttributes,
			checksumMain: new Uint8Array(neutralMuiResource.data.checksumMain),
			checksumService: new Uint8Array(
				neutralMuiResource.data.checksumService
			),
			language: langTag,
			ultimateFallbackLanguage: '',
			ultimateFallbackLocation: 'external',
			mainTypes: neutralMuiResource.data.muiTypes.slice(),
			muiTypes: [],
		};
	}
	return result;
}

/**
 * Makes (splits) MUI resource executables from one executable containing multiple language resources.
 * @param baseExecutableResource Base executable data which contains all localized resources.
 *   Note that the resource entries of `baseExecutableResource` will be modified in place.
 * @param neutralResources Resource types which should be included in the LN resource binary
 * @param localizedResources Resource types which should be included in the MUI resource binaries.
 *   Can include the types included in `neutralResources`.
 * @param defaultLangId The LANGID value for the default language. This is used for fallback language value and
 *   picking up resources stored to the LN executable (for the resource of `neutralResources` which is also included in `localizedResources`).
 * @param is32bit true if requiring `NtExecutable` be 32-bit executable.
 * @returns Splitted LN executable resource (`baseExecutableResource`) and tuple of MUI executables (`muiExecutables`)
 */
export function makeMuiResourcesFromSingleExecutable(
	baseExecutableResource: NtExecutableResource,
	neutralResources: ReadonlyArray<string | number>,
	localizedResources: ReadonlyArray<string | number>,
	defaultLangId: number,
	is32bit: boolean = false,
	fallbackLangIdIfLocalizedNotExist: number = defaultLangId
): {
	/** LN executable resource. This instance is equal to `baseExecutableResource` parameter of {@linkcode makeMuiResourcesFromSingleExecutable}. */
	baseExecutableResource: NtExecutableResource;
	/**
	 * Array of tuple of language tag (e.g. `en-US`) and generated MUI executable (`NtExecutable`; not `NtExecutableResource`).
	 * To write to file, use the language tag as the directory name.
	 */
	muiExecutables: ReadonlyArray<[langTag: string, executable: NtExecutable]>;
} {
	if (localizedResources.length === 0) {
		throw new Error('No localized resource type is specified');
	}
	if (!(defaultLangId in langIdToLanguageTagMap)) {
		throw new Error('Invalid or unknown defaultLangId value');
	}
	// Special handle for resource types: if these will be included in LN, these should also be included in MUI
	//   3: RT_ICON
	//   5: RT_DIALOG
	//   6: RT_STRING
	//   16: RT_VERSION
	[3, 5, 6, 16].forEach((type) => {
		if (neutralResources.indexOf(type) >= 0) {
			if (localizedResources.indexOf(type) < 0) {
				localizedResources = localizedResources.concat(type);
			}
			// For RT_ICON, RT_ICON_GROUP should be included
			if (type === 3) {
				if (neutralResources.indexOf(14) < 0) {
					neutralResources = neutralResources.concat(14);
				}
				if (localizedResources.indexOf(14) < 0) {
					localizedResources = localizedResources.concat(14);
				}
			}
		}
	});
	if (neutralResources.indexOf('MUI') < 0) {
		neutralResources = neutralResources.concat('MUI');
	}
	if (localizedResources.indexOf('MUI') < 0) {
		localizedResources = localizedResources.concat('MUI');
	}
	// Gather all LANGIDs for `localizedResources`
	const resourcesPerLangId: Array<
		[langId: number, entries: Type.ResourceEntry[]]
	> = [];
	baseExecutableResource.entries.forEach((entry) => {
		if (localizedResources.some((type) => entry.type === type)) {
			// String value of `lang` is rarely used, so ignores here
			if (typeof entry.lang === 'number') {
				let found = false;
				for (let i = 0, l = resourcesPerLangId.length; i < l; ++i) {
					const data = resourcesPerLangId[i]!;
					if (data[0] === entry.lang) {
						data[1].push(
							cloneResourceEntryWithLangIdAndReplaceVersionData(
								entry,
								entry.lang
							)
						);
						found = true;
						break;
					}
				}
				if (!found) {
					resourcesPerLangId.push([
						entry.lang,
						[
							cloneResourceEntryWithLangIdAndReplaceVersionData(
								entry,
								entry.lang
							),
						],
					]);
				}
			}
		}
	});

	// Add fallback resources for non-default language
	let defaultEntries: Type.ResourceEntry[] | undefined;
	resourcesPerLangId.forEach(([langId, entries]) => {
		if (langId === fallbackLangIdIfLocalizedNotExist) {
			defaultEntries = entries;
		}
	});
	if (defaultEntries != null) {
		resourcesPerLangId.forEach(([langId, entries]) => {
			if (langId === fallbackLangIdIfLocalizedNotExist) {
				return;
			}
			const existingTypes = entries.map((entry) => entry.type);
			defaultEntries!.forEach((entry) => {
				if (existingTypes.some((type) => entry.type === type)) {
					return;
				}
				const newEntry =
					cloneResourceEntryWithLangIdAndReplaceVersionData(
						entry,
						langId
					);
				entries.push(newEntry);
			});
		});
	}

	const checksumMain = createChecksumBinary();
	const checksumService = createChecksumBinary();

	const lnMuiResourceInfo = MuiResourceInfo.createEmpty();
	lnMuiResourceInfo.data = {
		resLang: 1033,
		isLn: true,
		fileType: 'application',
		systemAttributes: 0,
		checksumMain,
		checksumService,
		language: '',
		ultimateFallbackLanguage: langIdToLanguageTag(defaultLangId),
		ultimateFallbackLocation: 'external',
		mainTypes: neutralResources.slice(),
		muiTypes: localizedResources.slice(),
	};

	const generated = lnMuiResourceInfo.generateEntry();
	// Put MUI resource to baseExecutableResource, and drop localized resources
	{
		const droppedLocalizedResources: Record<string, Type.ResourceEntry[]> =
			{};
		for (let i = baseExecutableResource.entries.length - 1; i >= 0; --i) {
			let entry = baseExecutableResource.entries[i]!;
			if (entry.type === 16 && typeof entry.lang === 'number') {
				entry = baseExecutableResource.entries[i] =
					cloneResourceEntryWithLangIdAndReplaceVersionData(
						entry,
						entry.lang
					);
			}
			if (entry.type === 'MUI') {
				// Remove duplicate resources if already found
				baseExecutableResource.entries.splice(i, 1);
			} else {
				// If the resource type is not in `neutralResources`, drop it
				if (!neutralResources.some((type) => type === entry.type)) {
					baseExecutableResource.entries.splice(i, 1);
				}
				// If the resource will be included, but is also included in MUI, drop non-default language resources
				else if (
					localizedResources.some((type) => type === entry.type)
				) {
					const key =
						typeof entry.type === 'number'
							? `n${entry.type}`
							: `s${entry.type}`;
					const a =
						droppedLocalizedResources[key] ||
						(droppedLocalizedResources[key] = []);
					a.push(entry);
					baseExecutableResource.entries.splice(i, 1);
				}
			}
		}
		Object.keys(droppedLocalizedResources).forEach((key) => {
			const a = droppedLocalizedResources[key]!;
			if (a.length > 0) {
				// If no defaultLangId entry is found, use the first entry
				let foundEntry = a[0]!;
				for (let i = 0, l = a.length; i < l; ++i) {
					const entry = a[i]!;
					if (entry.lang === defaultLangId) {
						foundEntry = entry;
					}
				}
				baseExecutableResource.entries.push(foundEntry);
			}
		});
		if (generated != null) {
			baseExecutableResource.entries.unshift(generated);
		}
	}

	const muiExecutables = resourcesPerLangId.map(
		([langId, resources]): [langTag: string, executable: NtExecutable] => {
			const executable = NtExecutable.createEmpty(is32bit);
			const res = NtExecutableResource.from(executable);
			res.entries = resources;

			const langTag = langIdToLanguageTag(langId);

			const mui = MuiResourceInfo.createEmpty();
			mui.data = {
				resLang: 1033,
				isLn: false,
				fileType: 'application',
				systemAttributes: 0,
				checksumMain,
				checksumService,
				language: langTag,
				ultimateFallbackLanguage: '',
				ultimateFallbackLocation: 'external',
				mainTypes: localizedResources.slice(),
				muiTypes: [],
			};
			const resource = mui.generateEntry();

			if (resource != null) {
				res.entries.unshift(resource);
			}
			res.outputResource(executable);
			return [langTag, executable];
		}
	);
	return {
		baseExecutableResource,
		muiExecutables,
	};
}

const defaultLocalizedTypes: ReadonlyArray<
	[type: string | number, alsoInNeutral: boolean]
> = [
	[4, false], // RT_MENU
	[5, false], // RT_DIALOG
	[6, false], // RT_STRING
	[9, false], // RT_ACCELERATOR
	[16, true], // RT_VERSION
];

/**
 * Makes (splits) MUI resource executables from one executable containing multiple language resources.
 * This function calculates and uses `neutralResources` and `localizedResources` for {@linkcode makeMuiResourcesFromSingleExecutable}.
 * Note that this function does not include icons into localized resources.
 * To include icons, use `makeMuiResourcesFromSingleExecutable`.
 * @param baseExecutableResource Base executable data which contains all localized resources.
 *   Note that the resource entries of `baseExecutableResource` will be modified in place.
 * @param defaultLangId The LANGID value for the default language. This is used for fallback language value and
 *   picking up resources stored to the LN executable (for the resource of `neutralResources` which is also included in `localizedResources`).
 * @param is32bit true if requiring `NtExecutable` be 32-bit executable.
 * @returns Splitted LN executable resource (`baseExecutableResource`) and tuple of MUI executables (`muiExecutables`)
 */
export function makeMuiResourcesFromSingleExecutableAuto(
	baseExecutableResource: NtExecutableResource,
	defaultLangId: number,
	is32bit: boolean = false,
	fallbackLangIdIfLocalizedNotExist: number = defaultLangId
): {
	/** LN executable resource. This instance is equal to `baseExecutableResource` parameter of {@linkcode makeMuiResourcesFromSingleExecutable}. */
	baseExecutableResource: NtExecutableResource;
	/**
	 * Array of tuple of language tag (e.g. `en-US`) and generated MUI executable (`NtExecutable`; not `NtExecutableResource`).
	 * To write to file, use the language tag as the directory name.
	 */
	muiExecutables: ReadonlyArray<[langTag: string, executable: NtExecutable]>;
} {
	const addedResourceTypes: Record<string, boolean> = {};
	const neutralResources: Array<string | number> = ['MUI'];
	const localizedResources: Array<string | number> = ['MUI'];
	baseExecutableResource.entries.forEach((entry) => {
		const addedTypeName =
			typeof entry.type === 'number'
				? `d${entry.type}`
				: `s${entry.type}`;
		if (addedResourceTypes[addedTypeName]) {
			return;
		}
		addedResourceTypes[addedTypeName] = true;

		let found = false;
		defaultLocalizedTypes.forEach(([type, alsoInNeutral]) => {
			if (entry.type === type) {
				found = true;
				localizedResources.push(type);
				if (alsoInNeutral) {
					neutralResources.push(type);
				}
			}
		});
		if (!found) {
			neutralResources.push(entry.type);
		}
	});
	return makeMuiResourcesFromSingleExecutable(
		baseExecutableResource,
		neutralResources,
		localizedResources,
		defaultLangId,
		is32bit,
		fallbackLangIdIfLocalizedNotExist
	);
}

import * as fs from 'fs';
import * as path from 'path';
import * as koffi from 'koffi';

/**
 * @typedef {{ __type?: 'HICON' } | false} HIcon
 * @typedef {{ __type?: 'HBITMAP' } | false} HBitmap
 */

const HANDLE = koffi.pointer('HANDLE', koffi.opaque());

const kernel32 = koffi.load('kernel32.dll');
const LoadLibraryExW = kernel32.func('LoadLibraryExW', HANDLE, [
	'const char16*',
	HANDLE,
	'uint32',
]);
const LOAD_LIBRARY_AS_DATAFILE = 0x2;
const FreeLibrary = kernel32.func('FreeLibrary', 'int', [HANDLE]);
const SetThreadPreferredUILanguages = kernel32.func(
	'SetThreadPreferredUILanguages',
	'int',
	['uint32', 'const uint16*', koffi.out('uint32*')]
);
const MUI_LANGUAGE_NAME = 8;

const versionDll = koffi.load('api-ms-win-core-version-l1-1-0.dll');
const GetFileVersionInfoSizeExW = versionDll.func(
	'GetFileVersionInfoSizeExW',
	'uint32',
	['uint32', 'const char16*', koffi.out('uint32*')]
);
const FILE_VER_GET_LOCALISED = 0;
const FILE_VER_GET_NEUTRAL = 1;

/**
 * @typedef {Object} ICONINFO
 * @property {number} fIcon
 * @property {number} xHotspot
 * @property {number} yHotspot
 * @property {HBitmap} hbmMask
 * @property {HBitmap} hbmColor
 */
const ICONINFO = koffi.struct('ICONINFO', {
	fIcon: 'int',
	xHotspot: 'uint32',
	yHotspot: 'uint32',
	hbmMask: HANDLE,
	hbmColor: HANDLE,
});

const user32 = koffi.load('user32.dll');
const LoadImageW = user32.func('LoadImageW', HANDLE, [
	HANDLE,
	'const char16_t*',
	'uint',
	'int',
	'int',
	'uint',
]);
const IMAGE_ICON = 1;
const LR_LOADFROMFILE = 0x10;
const DestroyIcon = user32.func('DestroyIcon', 'int', [HANDLE]);
const GetDC = user32.func('GetDC', HANDLE, [HANDLE]);
const GetIconInfo = user32.func('GetIconInfo', 'int', [
	HANDLE,
	koffi.out(koffi.pointer(ICONINFO)),
]);
const ReleaseDC = user32.func('ReleaseDC', 'int', [HANDLE, HANDLE]);
const LoadStringW = user32.func('LoadStringW', 'int', [
	HANDLE,
	'uint',
	koffi.out('char16*'),
	'int',
]);

// interface BITMAP {
// 	bmType: number;
// 	bmWidth: number;
// 	bmHeight: number;
// 	bmWidthBytes: number;
// 	bmPlanes: number;
// 	bmBitsPixel: number;
// 	bmBits: unknown;
// }
// const BITMAP = koffi.struct('BITMAP', {
// 	bmType: 'int32',
// 	bmWidth: 'int32',
// 	bmHeight: 'int32',
// 	bmWidthBytes: 'int32',
// 	bmPlanes: 'uint16',
// 	bmBitsPixel: 'uint16',
// 	bmBits: 'void*',
// });
/**
 * @typedef {Object} BITMAPINFOHEADER
 * @property {number} biSize
 * @property {number} biWidth
 * @property {number} biHeight
 * @property {number} biPlanes
 * @property {number} biBitCount
 * @property {number} biCompression
 * @property {number} biSizeImage
 * @property {number} biXPelsPerMeter
 * @property {number} biYPelsPerMeter
 * @property {number} biClrUsed
 * @property {number} biClrImportant
 */
const BITMAPINFOHEADER = koffi.struct('BITMAPINFOHEADER', {
	biSize: 'uint32',
	biWidth: 'int32',
	biHeight: 'int32',
	biPlanes: 'uint16',
	biBitCount: 'uint16',
	biCompression: 'uint32',
	biSizeImage: 'uint32',
	biXPelsPerMeter: 'int32',
	biYPelsPerMeter: 'int32',
	biClrUsed: 'uint32',
	biClrImportant: 'uint32',
});
// koffi does not support dynamic array which uses subfield as a count such as `koffi.array('uint32', 'bmiHeader.biClrUsed', 256)`,
// so we write flatten struct
/**
 * @typedef {Object} BITMAPINFO
 * @property {number} biSize
 * @property {number} biWidth
 * @property {number} biHeight
 * @property {number} biPlanes
 * @property {number} biBitCount
 * @property {number} biCompression
 * @property {number} biSizeImage
 * @property {number} biXPelsPerMeter
 * @property {number} biYPelsPerMeter
 * @property {number} biClrUsed
 * @property {number} biClrImportant
 * @property {number[]} bmiColors
 */
const BITMAPINFO = koffi.struct('BITMAPINFO', {
	biSize: 'uint32',
	biWidth: 'int32',
	biHeight: 'int32',
	biPlanes: 'uint16',
	biBitCount: 'uint16',
	biCompression: 'uint32',
	biSizeImage: 'uint32',
	biXPelsPerMeter: 'int32',
	biYPelsPerMeter: 'int32',
	biClrUsed: 'uint32',
	biClrImportant: 'uint32',
	bmiColors: koffi.array('uint32', 'biClrUsed', 256),
});

const gdi32 = koffi.load('gdi32.dll');
const DeleteObject = gdi32.func('DeleteObject', 'int', [HANDLE]);
// const GetObjectW = gdi32.func('GetObjectW', 'int', [
// 	HANDLE,
// 	'int',
// 	koffi.out('void*'),
// ]);
const GetDIBits = gdi32.func('GetDIBits', 'int', [
	HANDLE,
	HANDLE,
	'uint',
	'uint',
	koffi.out('void*'),
	koffi.inout(koffi.pointer(BITMAPINFO)),
	'uint',
]);
const BI_RGB = 0;
const DIB_RGB_COLORS = 0;

/**
 * @typedef {Object} SHFILEINFOW
 * @property {HIcon} hIcon
 * @property {number} iIcon
 * @property {number} dwAttributes
 * @property {string} szDisplayName
 * @property {string} szTypeName
 */
const SHFILEINFOW = koffi.struct('SHFILEINFOW', {
	hIcon: HANDLE,
	iIcon: 'int',
	dwAttributes: 'uint32',
	szDisplayName: koffi.array('char16', 260),
	szTypeName: koffi.array('char16', 80),
});
const SHGFI_ICON = 0x100;
// const SHGFI_SYSICONINDEX = 0x4000;

const shell32 = koffi.load('shell32.dll');
const SHGetFileInfoW = shell32.func('SHGetFileInfoW', 'uintptr_t', [
	'const char16_t*' /* pszPath */,
	'uint32' /* dwFileAttributes */,
	koffi.out(koffi.pointer(SHFILEINFOW)) /* psfi */,
	'uint' /* cbFileInfo */,
	'uint' /* uFlags */,
]);

/**
 *
 * @param {string} langTag
 * @returns
 */
function changeThreadLanguage(langTag) {
	const p = [0];
	return !!SetThreadPreferredUILanguages(
		MUI_LANGUAGE_NAME,
		koffi.as(langTag + '\0', 'const char16_t*'),
		p
	);
}

/**
 *
 * @param {string} iconPath
 * @param {number} width
 * @param {number} height
 * @returns {HIcon}
 */
export function loadHIconFromIcoFile(iconPath, width, height) {
	const r = LoadImageW(
		null,
		iconPath,
		IMAGE_ICON,
		width,
		height,
		LR_LOADFROMFILE
	);
	if (!r) {
		throw new Error('Cannot load icon from file: ' + iconPath);
	}
	return r;
}

/**
 * @param {HIcon} icon
 */
export function destroyIcon(icon) {
	DestroyIcon(icon);
}

/**
 *
 * @param {HIcon} icon
 * @returns {ICONINFO}
 */
export function getIconInfo(icon) {
	/** @type {ICONINFO} */
	const ii = {};
	if (!GetIconInfo(icon, ii)) {
		throw new Error('Cannot get icon info');
	}
	return ii;
}

/**
 *
 * @param {HBitmap} bitmap
 */
export function destroyBitmap(bitmap) {
	DeleteObject(bitmap);
}

/**
 *
 * @param {HBitmap} bitmap1
 * @param {HBitmap} bitmap2
 * @param {string} tempDir
 * @returns {boolean}
 */
export function isEqualBitmap(bitmap1, bitmap2, tempDir) {
	const hDC = GetDC(null);
	if (!hDC) {
		return false;
	}
	try {
		/** @type {BITMAPINFO} */
		const bi1 = {
			biSize: BITMAPINFOHEADER.size,
			biWidth: 0,
			biHeight: 0,
			biPlanes: 0,
			biBitCount: 0,
			biCompression: 0,
			biSizeImage: 0,
			biXPelsPerMeter: 0,
			biYPelsPerMeter: 0,
			biClrUsed: 0,
			biClrImportant: 0,
			bmiColors: [],
		};
		/** @type {BITMAPINFO} */
		const bi2 = {
			...bi1,
			bmiColors: [],
		};
		if (
			!GetDIBits(
				hDC,
				bitmap1,
				0,
				0,
				koffi.as(null, 'uint8*'),
				bi1,
				DIB_RGB_COLORS
			)
		) {
			return false;
		}
		if (
			!GetDIBits(
				hDC,
				bitmap2,
				0,
				0,
				koffi.as(null, 'uint8*'),
				bi2,
				DIB_RGB_COLORS
			)
		) {
			return false;
		}
		if (
			bi1.biWidth !== bi2.biWidth ||
			bi1.biHeight !== bi2.biHeight ||
			bi1.biBitCount !== bi2.biBitCount
		) {
			return false;
		}
		const absHeight = Math.abs(bi1.biHeight);
		if (bi1.biHeight >= 0) {
			bi1.biHeight = -bi1.biHeight;
		}
		bi1.biCompression = BI_RGB;
		if (bi2.biHeight >= 0) {
			bi2.biHeight = -bi2.biHeight;
		}
		bi2.biCompression = BI_RGB;
		const bits1 = new Uint8Array(
			(bi1.biWidth * absHeight * bi1.biBitCount) / 8
		);
		const bits2 = new Uint8Array(bits1.length);
		if (
			!GetDIBits(
				hDC,
				bitmap1,
				0,
				absHeight,
				koffi.as(bits1, 'uint8*'),
				bi1,
				DIB_RGB_COLORS
			)
		) {
			return false;
		}
		if (
			!GetDIBits(
				hDC,
				bitmap2,
				0,
				absHeight,
				koffi.as(bits2, 'uint8*'),
				bi2,
				DIB_RGB_COLORS
			)
		) {
			return false;
		}
		fs.writeFileSync(path.resolve(tempDir, 'temp1.bin'), bits1);
		fs.writeFileSync(path.resolve(tempDir, 'temp2.bin'), bits2);
		for (let i = 0, l = bits1.length; i < l; ++i) {
			if (bits1[i] !== bits2[i]) {
				return false;
			}
			if (bi1.biBitCount === 32) {
				if (
					bits1[i + 1] !== bits2[i + 1] ||
					bits1[i + 2] !== bits2[i + 2]
				) {
					return false;
				}
				// ignore third-bit which is alpha channel
				i += 3;
			}
		}
		return true;
	} finally {
		ReleaseDC(null, hDC);
	}
}

/**
 * @typedef {import('./testWorkerTypes').TestParameter} TestParameter
 * @typedef {import('./testWorkerTypes').TestResult} TestResult
 */

/**
 * @param {TestResult} testResult
 * @param {string} exePath
 * @param {string} expectedIconFile
 * @param {string} tempDir
 */
function testMatchExeIcon(testResult, exePath, expectedIconFile, tempDir) {
	// Use Win32API to validate
	const shfi = /** @type {SHFILEINFOW} */ ({});
	const r = /** @type {number} */ (
		SHGetFileInfoW(exePath, 0, shfi, SHFILEINFOW.size, SHGFI_ICON)
	);
	testResult.resultOfSHGetFileInfoW = !!r;
	testResult.isEqualIconBitmapColor = false;
	testResult.isEqualIconBitmapMask = false;
	if (!shfi.hIcon) {
		testResult.errorMessage =
			'Cannot retrieve icon from executable: ' + exePath;
	} else {
		try {
			const baseIcon = loadHIconFromIcoFile(expectedIconFile, 32, 32);

			const iiBase = getIconInfo(baseIcon);
			const iiShell = getIconInfo(shfi.hIcon);
			try {
				const isEqualMask = isEqualBitmap(
					iiBase.hbmMask,
					iiShell.hbmMask,
					tempDir
				);
				const isEqualColor = isEqualBitmap(
					iiBase.hbmColor,
					iiShell.hbmColor,
					tempDir
				);
				testResult.isEqualIconBitmapMask = isEqualMask;
				testResult.isEqualIconBitmapColor = isEqualColor;
			} catch (e) {
				testResult.errorMessage =
					e instanceof Error ? e.message : String(e);
			} finally {
				destroyBitmap(iiBase.hbmMask);
				destroyBitmap(iiBase.hbmColor);
				destroyIcon(baseIcon);
				destroyBitmap(iiShell.hbmMask);
				destroyBitmap(iiShell.hbmColor);
			}
		} catch (e) {
			testResult.errorMessage =
				e instanceof Error ? e.message : String(e);
		} finally {
			destroyIcon(shfi.hIcon);
		}
	}
	return testResult;
}

/**
 * @param {TestResult} testResult
 * @param {string} exePath
 */
function testIfMuiVersionValid(testResult, exePath) {
	testResult.isValidLnVersion = !!GetFileVersionInfoSizeExW(
		FILE_VER_GET_NEUTRAL,
		exePath,
		null
	);
	testResult.isValidMuiVersion = !!GetFileVersionInfoSizeExW(
		FILE_VER_GET_LOCALISED,
		exePath,
		null
	);
}

/**
 *
 * @param {TestResult} testResult
 * @param {string} exePath
 * @param {string} expectedText
 */
function testLocalizedString(testResult, exePath, expectedText) {
	const module = LoadLibraryExW(exePath, null, LOAD_LIBRARY_AS_DATAFILE);
	if (!module) {
		testResult.errorMessage = 'Cannot load as data module: ' + exePath;
	} else {
		try {
			const buffer = ['\0'.repeat(255)];
			LoadStringW(module, 101, buffer, 255);
			testResult.isValidLocalizedText = buffer[0] === expectedText;
		} finally {
			FreeLibrary(module);
		}
	}
}

process.on('message', (message) => {
	if (typeof message !== 'object' || message == null) {
		throw new Error('Invalid message');
	}
	const param = /** @type {TestParameter} */ (message);
	/** @type {TestResult} */
	const result = {};
	if (!changeThreadLanguage(param.languageTag)) {
		result.errorMessage = 'Cannot set default language';
	} else {
		testMatchExeIcon(
			result,
			param.exePath,
			param.expectedIconFile,
			param.tempDir
		);
		if (!result.errorMessage) {
			testIfMuiVersionValid(result, param.exePath);
		}
		if (!result.errorMessage) {
			testLocalizedString(result, param.exePath, param.expectedText);
		}
	}
	process.send(result);
	process.exit(0);
});

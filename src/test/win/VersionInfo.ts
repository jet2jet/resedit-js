import { Format, NtExecutableResource } from 'pe-library';

import { loadExecutableWithResourceCheck, testExec } from '../util/fs.js';

import VersionFileFlags from '@/resource/VersionFileFlags.js';
import VersionFileOS from '@/resource/VersionFileOS.js';
import VersionFileType from '@/resource/VersionFileType.js';
import VersionInfo, { type VersionFixedInfo } from '@/resource/VersionInfo.js';

const platform = __TEST_PLATFORM__;

// eslint-disable-next-line @typescript-eslint/ban-types
function copyValues<T extends object>(dest: T, src: Readonly<T>) {
	type TKeys = keyof T;
	Object.keys(src).forEach((key) => {
		dest[key as TKeys] = src[key as TKeys];
	});
}

function doTestExecWithVersionValues(
	bin: ArrayBuffer,
	appName: string,
	versionFixed: VersionFixedInfo | null,
	lang: number,
	codepage: number,
	versionStrings: Record<string, string> | null
) {
	const copiedVersionStrings: Record<string, string> = {};
	if (versionStrings) {
		copyValues(copiedVersionStrings, versionStrings);
	}

	// execute binary and split output by lines
	const output = testExec(bin, appName, platform)
		.replace(/(?:\r\n|[\r\n])$/g, '')
		.split(/\r\n|[\r\n]/g);

	let versionStringsChecked = false;
	output.forEach((line) => {
		if (!line) {
			return;
		}
		// <key>:<value>
		const [key, value] = line.split(/:/g, 2) as [string, string];
		if (/^String\./.test(key)) {
			// key = 'Strings.<lang>-<cp>.<key>'
			const [, langCp, stringKey] = key.split(/\./g, 3) as [
				string,
				string,
				string
			];
			if (langCp === `${lang}-${codepage}`) {
				if (versionStrings) {
					expect(value).toEqual(versionStrings[stringKey]);
					try {
						// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
						delete copiedVersionStrings[stringKey];
					} catch (_e) {}
				} else {
					fail(
						`Unexpected value for [lang,cp]=[${lang},${codepage}]: ${value}`
					);
				}
				versionStringsChecked = true;
			}
		} else {
			if (versionFixed) {
				switch (key) {
					case 'FileVersionMS':
						expect(Number(value)).toEqual(
							versionFixed.fileVersionMS
						);
						break;
					case 'FileVersionLS':
						expect(Number(value)).toEqual(
							versionFixed.fileVersionLS
						);
						break;
					case 'ProductVersionMS':
						expect(Number(value)).toEqual(
							versionFixed.productVersionMS
						);
						break;
					case 'ProductVersionLS':
						expect(Number(value)).toEqual(
							versionFixed.productVersionLS
						);
						break;
					case 'FileType':
						expect(Number(value)).toEqual(versionFixed.fileType);
						break;
					default:
						// all other keys are ignored
						break;
				}
			}
		}
	});
	if (versionStrings) {
		expect(versionStringsChecked).toBeTruthy();
		// all string values should be stored
		expect(Object.keys(copiedVersionStrings).length).toEqual(0);
	}
}

describe(`VersionInfo - ${platform}`, () => {
	const lang = 1033;
	const langAnother = 1041;
	const codepage = 1200;
	const fileVersions = [1, 2, 3, 4] as const;
	const fileVersionString = `${fileVersions[0]}.${fileVersions[1]}.${fileVersions[2]}.${fileVersions[3]}`;
	const productVersions = [1, 1, 2, 3] as const;
	const productVersionString = `${productVersions[0]}.${productVersions[1]}.${productVersions[2]}.${productVersions[3]}`;
	const versionFixedValuesWithoutVersionNumbers: VersionFixedInfo = {
		fileVersionMS: 0,
		fileVersionLS: 0,
		productVersionMS: 0,
		productVersionLS: 0,
		fileFlagsMask: VersionFileFlags.Patched,
		fileFlags: VersionFileFlags.Patched,
		fileOS: VersionFileOS.NT_Windows32,
		fileType: VersionFileType.App,
		fileSubtype: 0,
		fileDateMS: 0,
		fileDateLS: 0,
	};
	const versionFixedValues: VersionFixedInfo = {
		...versionFixedValuesWithoutVersionNumbers,
		fileVersionMS: (fileVersions[0] << 16) | fileVersions[1],
		fileVersionLS: (fileVersions[2] << 16) | fileVersions[3],
		productVersionMS: (productVersions[0] << 16) | productVersions[1],
		productVersionLS: (productVersions[2] << 16) | productVersions[3],
	};
	const versionStringValuesWithoutVersions = {
		FileDescription: 'dummy version - replaced by versionInfo test',
		ProductName: 'versionInfo test',
		OriginalFilename: 'versionInfo.exe',
	};
	const versionStringValues = {
		...versionStringValuesWithoutVersions,
		FileVersion: fileVersionString,
		ProductVersion: productVersionString,
	};

	it('append new version info as a new resource data', () => {
		const appName = 'ReadVersionApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const version = VersionInfo.createEmpty();
		version.lang = lang;

		copyValues(version.fixedInfo, versionFixedValues);
		version.setStringValues({ lang, codepage }, versionStringValues);

		version.outputToResourceEntries(res.entries);
		expect(res.entries.length).toEqual(1);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			lang,
			codepage,
			versionStringValues
		);
	});

	it('append new version info as a new resource data (with VersionInfo.create)', () => {
		const appName = 'ReadVersionApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const version = VersionInfo.create({
			lang,
			fixedInfo: versionFixedValues,
			strings: [
				{
					lang,
					codepage,
					values: versionStringValues,
				},
			],
		});

		version.outputToResourceEntries(res.entries);
		expect(res.entries.length).toEqual(1);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			lang,
			codepage,
			versionStringValues
		);
	});

	it('append new version info as a new resource data 2', () => {
		const appName = 'ReadVersionApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const version = VersionInfo.createEmpty();
		version.lang = langAnother;

		copyValues(version.fixedInfo, versionFixedValuesWithoutVersionNumbers);
		version.setStringValues(
			{ lang: langAnother, codepage },
			versionStringValuesWithoutVersions
		);

		// use utility method
		version.setFileVersion(
			fileVersions[0],
			fileVersions[1],
			fileVersions[2],
			fileVersions[3],
			langAnother
		);
		version.setProductVersion(
			productVersions[0],
			productVersions[1],
			productVersions[2],
			productVersions[3]
			// skip specifying lang (use version.lang value)
		);

		version.outputToResourceEntries(res.entries);
		expect(res.entries.length).toEqual(1);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			langAnother,
			codepage,
			versionStringValues
		);
	});

	it('append new version info to existing resource data (no version info)', () => {
		const appName = 'ReadVersionApp_NoVersion';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		// check no entries
		expect(VersionInfo.fromEntries(res.entries).length).toEqual(0);

		const version = VersionInfo.createEmpty();
		version.lang = lang;

		copyValues(version.fixedInfo, versionFixedValues);
		version.setStringValues({ lang, codepage }, versionStringValues);

		version.outputToResourceEntries(res.entries);
		// should be incremented because no version entries are available
		expect(res.entries.length).toEqual(countEntries + 1);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			lang,
			codepage,
			versionStringValues
		);
	});

	it('append new version info to existing resource data 2 (no version info)', () => {
		const appName = 'ReadVersionApp_NoVersion';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		// check no entries
		expect(VersionInfo.fromEntries(res.entries).length).toEqual(0);

		const version = VersionInfo.createEmpty();

		copyValues(version.fixedInfo, versionFixedValuesWithoutVersionNumbers);

		// use utility method
		version.setFileVersion(fileVersionString, lang);
		// set version.lang to invalid string value
		// to force setProductVersion use default lang value
		version.lang = '';
		// skip specifying lang to use default lang value
		version.setProductVersion(productVersionString);

		version.setStringValues(
			{ lang: 1033, codepage },
			versionStringValuesWithoutVersions
		);

		version.lang = 1033;
		version.outputToResourceEntries(res.entries);
		// should be incremented because no version entries are available
		expect(res.entries.length).toEqual(countEntries + 1);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			1033,
			codepage,
			versionStringValues
		);
	});

	it('replace existing version info', () => {
		const appName = 'ReadVersionApp_HasVersion';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		// check entries
		const baseVersions = VersionInfo.fromEntries(res.entries);
		expect(baseVersions.length).toBeGreaterThan(0);
		expect(baseVersions.some((v) => v.lang === lang)).toBeTruthy();
		expect(
			baseVersions
				.filter((v) => v.lang === lang)[0]!
				.getAvailableLanguages()
				.some((v) => v.lang === lang)
		).toBeTruthy();

		const version = VersionInfo.createEmpty();
		version.lang = lang;

		copyValues(version.fixedInfo, versionFixedValues);
		version.setStringValues({ lang, codepage }, versionStringValues);

		version.outputToResourceEntries(res.entries);
		// should be same because existing version entry is replaced
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			lang,
			codepage,
			versionStringValues
		);
	});

	it('append another-language version info to existing resource data', () => {
		const appName = 'ReadVersionApp_HasVersion';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		// check entries
		const baseVersions = VersionInfo.fromEntries(res.entries);
		expect(baseVersions.length).toBeGreaterThan(0);
		expect(baseVersions.some((v) => v.lang === lang)).toBeTruthy();

		const version = baseVersions.filter((v) => v.lang === lang).shift()!;
		const verLangs = version.getAvailableLanguages().length;
		expect(
			version.getAvailableLanguages().some((v) => v.lang === lang)
		).toBeTruthy();

		copyValues(version.fixedInfo, versionFixedValues);
		// use another language for here
		version.setStringValues(
			{ lang: langAnother, codepage },
			versionStringValues
		);
		expect(version.getAvailableLanguages().length).toEqual(verLangs + 1);

		version.outputToResourceEntries(res.entries);
		// should be same because existing version entry is replaced
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			versionFixedValues,
			langAnother,
			codepage,
			versionStringValues
		);
	});

	it('remove specific language from version info', () => {
		const appName = 'ReadVersionApp_HasVersion';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		// check entries
		const baseVersions = VersionInfo.fromEntries(res.entries);
		expect(baseVersions.length).toBeGreaterThan(0);
		expect(baseVersions.some((v) => v.lang === lang)).toBeTruthy();
		const version = baseVersions.filter((v) => v.lang === lang)[0]!;
		const verLangs = version.getAvailableLanguages().length;
		expect(
			version.getAvailableLanguages().some((v) => v.lang === lang)
		).toBeTruthy();
		expect(verLangs).toBeGreaterThanOrEqual(2);

		version.removeAllStringValues({ lang, codepage });
		expect(version.getAvailableLanguages().length).toEqual(verLangs - 1);

		version.outputToResourceEntries(res.entries);
		// should be same because version info for another language is still available
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(
			exe.getSectionByEntry(Format.ImageDirectoryEntry.Resource)
		).not.toEqual(null);

		const newBin = exe.generate();

		doTestExecWithVersionValues(
			newBin,
			appName,
			null,
			lang,
			codepage,
			null
		);
	});
});

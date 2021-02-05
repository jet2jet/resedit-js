import { loadExecutableWithResourceCheck, testExec } from '../util/fs';

import NtExecutableResource from '@/NtExecutableResource';
import ImageDirectoryEntry from '@/format/ImageDirectoryEntry';
import VersionFileFlags from '@/resource/VersionFileFlags';
import VersionFileOS from '@/resource/VersionFileOS';
import VersionFileType from '@/resource/VersionFileType';
import VersionInfo, { VersionFixedInfo } from '@/resource/VersionInfo';

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
	versionStrings: { [key: string]: string } | null
) {
	const copiedVersionStrings: { [key: string]: string } = {};
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
		const [key, value] = line.split(/:/g, 2);
		if (/^String\./.test(key)) {
			// key = 'Strings.<lang>-<cp>.<key>'
			const [, langCp, stringKey] = key.split(/\./g, 3);
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
	const versionFixedValues: VersionFixedInfo = {
		fileVersionMS: 0x10002,
		fileVersionLS: 0x30004,
		productVersionMS: 0x10001,
		productVersionLS: 0x20003,
		fileFlagsMask: VersionFileFlags.Patched,
		fileFlags: VersionFileFlags.Patched,
		fileOS: VersionFileOS.NT_Windows32,
		fileType: VersionFileType.App,
		fileSubtype: 0,
		fileDateMS: 0,
		fileDateLS: 0,
	};
	const versionStringValues = {
		FileDescription: 'dummy version - replaced by versionInfo test',
		FileVersion: '1.2.3.4',
		ProductName: 'versionInfo test',
		ProductVersion: '1.1.2.3',
		OriginalFilename: 'versionInfo.exe',
	};

	it('append new version info as a new resource data', () => {
		const appName = 'ReadVersionApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const version = VersionInfo.createEmpty();
		version.lang = lang;

		copyValues(version.fixedInfo, versionFixedValues);
		version.setStringValues(
			{ lang: lang, codepage: codepage },
			versionStringValues
		);

		version.outputToResourceEntries(res.entries);
		expect(res.entries.length).toEqual(1);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

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
		version.setStringValues(
			{ lang: lang, codepage: codepage },
			versionStringValues
		);

		version.outputToResourceEntries(res.entries);
		// should be incremented because no version entries are available
		expect(res.entries.length).toEqual(countEntries + 1);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

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
				.filter((v) => v.lang === lang)[0]
				.getAvailableLanguages()
				.some((v) => v.lang === lang)
		).toBeTruthy();

		const version = VersionInfo.createEmpty();
		version.lang = lang;

		copyValues(version.fixedInfo, versionFixedValues);
		version.setStringValues(
			{ lang: lang, codepage: codepage },
			versionStringValues
		);

		version.outputToResourceEntries(res.entries);
		// should be same because existing version entry is replaced
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

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
			{ lang: langAnother, codepage: codepage },
			versionStringValues
		);
		expect(version.getAvailableLanguages().length).toEqual(verLangs + 1);

		version.outputToResourceEntries(res.entries);
		// should be same because existing version entry is replaced
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

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
		const version = baseVersions.filter((v) => v.lang === lang)[0];
		const verLangs = version.getAvailableLanguages().length;
		expect(
			version.getAvailableLanguages().some((v) => v.lang === lang)
		).toBeTruthy();
		expect(verLangs).toBeGreaterThanOrEqual(2);

		version.removeAllStringValues({ lang: lang, codepage: codepage });
		expect(version.getAvailableLanguages().length).toEqual(verLangs - 1);

		version.outputToResourceEntries(res.entries);
		// should be same because version info for another language is still available
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

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

/// <reference types='jest' />

import { loadExecutableWithResourceCheck, loadIcon, testExec } from '../util/fs';

import NtExecutableResource from '@/NtExecutableResource';
import IconFile from '@/data/IconFile';
import ImageDirectoryEntry from '@/format/ImageDirectoryEntry';
import IconGroupEntry from '@/resource/IconGroupEntry';

const platform = __TEST_PLATFORM__;

function testExecWithResultData(bin: ArrayBuffer, appName: string) {
	const output = testExec(bin, appName, platform)
		.replace(/(?:\r\n|[\r\n])$/g, '');
	const result: { [type: string]: { [key: string]: string; }; } = {};
	output.split(/\r\n|[\r\n]/g).forEach((token) => {
		const data = token.split(/\:/g, 2);
		const pairs = data[0].split(/\./g, 2);
		const obj = result[pairs[0]] || (result[pairs[0]] = {});
		obj[pairs[1]] = data[1];
	});
	return result;
}

function testIconPatterns(patterns: [number, number][], output: { [type: string]: { [key: string]: string; }; }) {
	patterns.forEach(([width, height]) => {
		const typeName = `${width}x${height}`;
		expect(output).toHaveProperty(typeName);
		const o = output[typeName];
		expect(o).toBeDefined();
		expect(o.isIcon).toEqual('1');
		expect(o.width).toEqual(`${width}`);
		expect(o.height).toEqual(`${height}`);
	});
}

describe(`IconGroupEntry - ${platform}`, () => {
	const DUMMY_ICON_4_PATTERNS: [number, number][] = [[16, 16], [32, 32], [64, 64], [256, 256]];

	it('append new icon entry as a new resource data', () => {
		const appName = 'LoadIconApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const iconFile = IconFile.from(loadIcon('data1_4b16_4b32_4b64_png256'));
		
		IconGroupEntry.replaceIconsForResource(
			res.entries,
			101,
			1033,
			iconFile.icons.map((icon) => icon.data)
		);

		expect(res.entries.length).toEqual(1 + iconFile.icons.length);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(null);

		const newBin = exe.generate();

		// the output should have all size patterns (16x16, 32x32, 64x64, and 256x256)
		const output = testExecWithResultData(newBin, appName);
		testIconPatterns(DUMMY_ICON_4_PATTERNS, output);
	});

	it('append new icon entry to existing resource data (no icon)', () => {
		const appName = 'LoadIconApp_NoIcon';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		const iconFile = IconFile.from(loadIcon('data1_4b16_4b32_4b64_png256'));

		IconGroupEntry.replaceIconsForResource(
			res.entries,
			101,
			1033,
			iconFile.icons.map((icon) => icon.data)
		);

		expect(res.entries.length).toEqual(countEntries + 1 + iconFile.icons.length);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(null);

		const newBin = exe.generate();

		// the output should have all size patterns (16x16, 32x32, 64x64, and 256x256)
		const output = testExecWithResultData(newBin, appName);
		testIconPatterns(DUMMY_ICON_4_PATTERNS, output);
	});

	it('replace existing icon entry', () => {
		const appName = 'LoadIconApp_HasIcon';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		const existEntries = IconGroupEntry.fromEntries(res.entries);
		const existEntryCount = existEntries.length;
		expect(existEntryCount).toBeGreaterThan(0);
		expect(existEntries.some((e) => e.id === 101 && e.lang === 1033)).toBeTruthy();
		const totalIconCount = existEntries.reduce((p, c) => (p + c.icons.length), 0);

		const iconFile = IconFile.from(loadIcon('data1_4b16_4b32_4b64_png256'));

		IconGroupEntry.replaceIconsForResource(
			res.entries,
			101,
			1033,
			iconFile.icons.map((icon) => icon.data)
		);

		// icon-group count should not be changed
		expect(IconGroupEntry.fromEntries(res.entries).length).toEqual(existEntryCount);
		// 'icon-group' count is not changed, but 'icon' count may be changed
		expect(res.entries.length).toEqual(countEntries + iconFile.icons.length - totalIconCount);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(null);

		const newBin = exe.generate();

		// the output should have all size patterns (16x16, 32x32, 64x64, and 256x256)
		const output = testExecWithResultData(newBin, appName);
		testIconPatterns(DUMMY_ICON_4_PATTERNS, output);
	});
});

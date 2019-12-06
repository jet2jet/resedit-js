/// <reference types='jest' />

import { loadExecutableWithResourceCheck, testExec } from '../util/fs';

import NtExecutableResource from '@/NtExecutableResource';
import ImageDirectoryEntry from '@/format/ImageDirectoryEntry';
import StringTable from '@/resource/StringTable';

const platform = __TEST_PLATFORM__;

function testExecWithSingleLine(bin: ArrayBuffer, appName: string) {
	return testExec(bin, appName, platform).replace(/(?:\r\n|[\r\n])$/g, '');
}

function testExecWithStringTable(bin: ArrayBuffer, appName: string) {
	const output = testExec(bin, appName, platform).replace(
		/(?:\r\n|[\r\n])$/g,
		''
	);
	const result: { [id: number]: string } = {};
	output.split(/\r\n|[\r\n]/g).forEach(token => {
		const pairs = token.split(/:/g, 2);
		result[Number(pairs[0])] = pairs[1];
	});
	return result;
}

describe(`StringTable - ${platform}`, () => {
	const stringValue = 'stringTable test';

	it('append new string entry as a new resource data', () => {
		const appName = 'LoadStringApp_NoRes';
		const exe = loadExecutableWithResourceCheck(appName, platform, false);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toEqual(0);

		const strings = new StringTable();
		strings.lang = 1033;

		// add string with id = 101
		strings.setById(101, stringValue);
		strings.replaceStringEntriesForExecutable(res);
		expect(res.entries.length).toEqual(1);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

		const newBin = exe.generate();

		const output = testExecWithSingleLine(newBin, appName);
		expect(output).toEqual(stringValue);
	});

	it('append new string entry to existing resource data (no string table)', () => {
		const appName = 'LoadStringApp_NoString';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		const strings = StringTable.fromEntries(1033, res.entries);
		expect(strings.getAllStrings().length).toEqual(0);

		// add string with id = 101
		strings.setById(101, stringValue);
		strings.replaceStringEntriesForExecutable(res);
		expect(res.entries.length).toEqual(countEntries + 1);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

		const newBin = exe.generate();

		const output = testExecWithSingleLine(newBin, appName);
		expect(output).toEqual(stringValue);
	});

	it('append new string entry to existing resource data (string table exist)', () => {
		const appName = 'LoadStringApp_HasString';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		const strings = StringTable.fromEntries(1033, res.entries);
		const allStrings = strings.getAllStrings();
		const countStrings = allStrings.length;
		expect(countStrings).toBeGreaterThan(0);

		// check if id = 101 exists
		const existData = strings.getById(101);
		expect(existData).not.toEqual(null);
		expect(existData).toEqual(
			allStrings.filter(o => o.id === 101).map(o => o.text)[0]
		);

		// add string with id = 102
		strings.setById(102, stringValue);
		expect(strings.getAllStrings().length).toEqual(countStrings + 1);
		strings.replaceStringEntriesForExecutable(res);
		// Both 101 and 102 belongs to the same table
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

		const newBin = exe.generate();

		// the output format is:
		//   <id>:<string>
		//   <id>:<string>
		//   .
		//   .
		//   .
		const result = testExecWithStringTable(newBin, appName);
		expect(result[101]).toEqual(existData);
		expect(result[102]).toEqual(stringValue);
	});

	it('replace existing string entry', () => {
		const appName = 'LoadStringApp_HasString';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		const countEntries = res.entries.length;
		expect(countEntries).toBeGreaterThan(0);

		const strings = StringTable.fromEntries(1033, res.entries);
		const allStrings = strings.getAllStrings();
		const countStrings = allStrings.length;
		expect(countStrings).toBeGreaterThan(0);

		// check if id = 101 exists
		const existData = strings.getById(101);
		expect(existData).not.toEqual(null);
		expect(existData).toEqual(
			allStrings.filter(o => o.id === 101).map(o => o.text)[0]
		);

		// replace string with id = 101
		strings.setById(101, stringValue);
		expect(strings.getAllStrings().length).toEqual(countStrings);
		strings.replaceStringEntriesForExecutable(res);
		expect(res.entries.length).toEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

		const newBin = exe.generate();

		// the output format is:
		//   <id>:<string>
		//   <id>:<string>
		//   .
		//   .
		//   .
		const result = testExecWithStringTable(newBin, appName);
		expect(result[101]).toEqual(stringValue);
	});

	it('remove existing string entry', () => {
		const appName = 'LoadStringApp_HasString';
		const exe = loadExecutableWithResourceCheck(appName, platform, true);

		const res = NtExecutableResource.from(exe);
		expect(res.entries.length).toBeGreaterThan(0);
		const countEntries = res.entries.length;

		const strings = StringTable.fromEntries(1033, res.entries);
		const allStrings = strings.getAllStrings();
		const countStrings = allStrings.length;
		expect(countStrings).toBeGreaterThan(0);

		// check if id = 101 exists
		const existData = strings.getById(101);
		expect(existData).not.toEqual(null);
		expect(existData).toEqual(
			allStrings.filter(o => o.id === 101).map(o => o.text)[0]
		);

		// replace string with id = 101
		strings.setById(101, null);
		expect(strings.getAllStrings().length).toEqual(countStrings - 1);
		strings.replaceStringEntriesForExecutable(res);
		// (the string table may be removed)
		expect(res.entries.length).toBeLessThanOrEqual(countEntries);

		res.outputResource(exe);
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);

		const newBin = exe.generate();

		// the output format is:
		//   <id>:<string>
		//   <id>:<string>
		//   .
		//   .
		//   .
		const result = testExecWithStringTable(newBin, appName);
		expect(result[101]).toEqual('');
	});
});

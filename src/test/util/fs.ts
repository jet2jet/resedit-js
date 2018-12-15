/// <reference types='node' />

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import NtExecutable from '@/NtExecutable';
import ImageDirectoryEntry from '@/format/ImageDirectoryEntry';

function loadBinary(filePath: string) {
	const buffer = fs.readFileSync(filePath);
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function mkdirp(dir: string) {
	const tokens = path.normalize(dir).split(path.sep);
	let curDir: string = '';
	tokens.forEach((token) => {
		if (!curDir) {
			curDir = token;
		} else {
			curDir += path.sep + token;
		}
		try {
			const stat = fs.statSync(curDir);
			if (stat.isDirectory()) {
				return;
			}
		} catch (_e) { }
		fs.mkdirSync(curDir);
	});
}

export function loadExeBinary(name: string, platform: string): ArrayBuffer {
	return loadBinary(path.resolve(__TEST_INPUT_ROOT__, name, platform, `${name}.exe`));
}

export function testExec(bin: ArrayBuffer, name: string, platform: string) {
	const dir = path.resolve(__TEST_TEMPDIR_ROOT__, name, platform);
	const file = path.join(dir, `${name}.exe`);

	mkdirp(dir);
	fs.writeFileSync(file, new Buffer(bin));

	const result = child_process.spawnSync(file, { encoding: 'ascii' });
	if (result.error) {
		throw result.error;
	}
	if (result.stderr) {
		throw new Error(result.stderr);
	}
	return result.stdout;
}

export function loadExecutableWithResourceCheck(appName: string, platform: string, exists: boolean): NtExecutable {
	const bin = loadExeBinary(appName, platform);
	const exe = NtExecutable.from(bin);
	if (exists) {
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(null);
	} else {
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).toEqual(null);
	}
	return exe;
}

export function loadIcon(name: string): ArrayBuffer {
	return loadBinary(path.resolve(__TEST_INPUT_ROOT__, 'icons', `${name}.ico`));
}

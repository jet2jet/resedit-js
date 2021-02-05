import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import NtExecutable from '@/NtExecutable';
import ImageDirectoryEntry from '@/format/ImageDirectoryEntry';

function loadBinary(filePath: string): ArrayBuffer | ArrayBufferView {
	return fs.readFileSync(filePath);
}

function loadText(filePath: string): string {
	return fs.readFileSync(filePath, 'utf8');
}

export function mkdirp(dir: string): void {
	const tokens = path.normalize(dir).split(path.sep);
	let curDir: string = '';
	tokens.forEach((token) => {
		if (!curDir) {
			curDir = token;
		} else {
			curDir += `${path.sep}${token}`;
		}
		try {
			const stat = fs.statSync(curDir);
			if (stat.isDirectory()) {
				return;
			}
		} catch (_e) {}
		fs.mkdirSync(curDir);
	});
}

export function loadExeBinary(
	name: string,
	platform: string
): ArrayBuffer | ArrayBufferView {
	return loadBinary(
		path.resolve(__TEST_INPUT_ROOT__, name, platform, `${name}.exe`)
	);
}

export function runExec(exePath: string, args?: readonly string[]): string {
	let result;
	if (args) {
		result = child_process.spawnSync(exePath, args, {
			encoding: 'ascii',
		});
	} else {
		result = child_process.spawnSync(exePath, {
			encoding: 'ascii',
		});
	}
	if (result.error) {
		throw result.error;
	}
	if (result.stderr) {
		throw new Error(result.stderr);
	}
	return result.stdout;
}

export function writeBinary(
	filePath: string,
	bin: ArrayBuffer | ArrayBufferView
): void {
	const dir = path.dirname(filePath);
	mkdirp(dir);

	let buffer: Buffer;
	if ('buffer' in bin) {
		buffer = Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength);
	} else {
		buffer = Buffer.from(bin);
	}
	fs.writeFileSync(filePath, buffer);
}

export function testExec(
	bin: ArrayBuffer,
	name: string,
	platform: string
): string {
	const file = path.resolve(
		__TEST_TEMPDIR_ROOT__,
		name,
		platform,
		`${name}.exe`
	);
	writeBinary(file, bin);

	return runExec(file);
}

export function loadExecutableWithResourceCheck(
	appName: string,
	platform: string,
	exists: boolean
): NtExecutable {
	const bin = loadExeBinary(appName, platform);
	const exe = NtExecutable.from(bin);
	if (exists) {
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).not.toEqual(
			null
		);
	} else {
		expect(exe.getSectionByEntry(ImageDirectoryEntry.Resource)).toEqual(
			null
		);
	}
	return exe;
}

export function loadIcon(name: string): ArrayBuffer | ArrayBufferView {
	return loadBinary(
		path.resolve(__TEST_INPUT_ROOT__, 'icons', `${name}.ico`)
	);
}

export function loadCert(name: string): ArrayBuffer | ArrayBufferView {
	return loadBinary(path.resolve(__TEST_INPUT_ROOT__, 'certs', name));
}

export function loadPrivatePem(name: string): string {
	return loadText(
		path.resolve(__TEST_INPUT_ROOT__, 'certs', `${name}.priv.pem`)
	);
}

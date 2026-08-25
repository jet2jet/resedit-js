import { fork } from 'child_process';
import * as fs from 'fs';
import * as inspector from 'inspector';
import * as path from 'path';
import * as url from 'url';
import { NtExecutable, NtExecutableResource } from 'pe-library';
import { loadExeBinary } from '../../util/fs.js';
import type { TestParameter, TestResult } from './testWorkerTypes.js';
import { makeMuiResourcesFromSingleExecutable } from '@/mui/muiUtils.js';

// @ts-expect-error: use import.meta.url due to ES module
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const platform = __TEST_PLATFORM__;

function isDebuggerAttached() {
	return inspector.url() != null;
}

async function runTestWorker(
	languageTag: string,
	exePath: string,
	expectedIconFile: string,
	expectedText: string
) {
	// Execute child process
	const child = fork(path.resolve(__dirname, 'testMatchWorker.mjs'));
	const param: TestParameter = {
		languageTag,
		tempDir: __TEST_TEMPDIR_ROOT__,
		exePath,
		expectedIconFile,
		expectedText,
	};
	child.send(param);
	let testResult: TestResult | undefined;
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(
			() => {
				child.kill();
				reject(new Error('Worker process timeout'));
			},
			isDebuggerAttached() ? 120000 : 3000
		);
		child.on('error', (e) => {
			clearTimeout(timer);
			child.kill();
			reject(e);
		});
		child.on('message', (message) => {
			testResult = message as TestResult;
		});
		child.on('exit', () => {
			clearTimeout(timer);
			resolve();
		});
	});
	if (testResult == null) {
		throw new Error('No test result returned');
	}
	if (testResult.errorMessage != null) {
		throw new Error(testResult.errorMessage);
	}
	expect(testResult.resultOfSHGetFileInfoW).toBe(true);
	expect(testResult.isEqualIconBitmapMask).toBe(true);
	expect(testResult.isEqualIconBitmapColor).toBe(true);
	expect(testResult.isValidLnVersion).toBe(true);
	expect(testResult.isValidMuiVersion).toBe(true);
	expect(testResult.isValidLocalizedText).toBe(true);
}

describe('Mui', () => {
	describe('makeMuiResourcesFromSingleExecutable', () => {
		const outputPathBase = path.resolve(
			__TEST_TEMPDIR_ROOT__,
			'mui',
			'split'
		);
		beforeEach(() => {
			fs.mkdirSync(outputPathBase, { recursive: true });
		});
		afterEach(() => {
			try {
				fs.rmSync(outputPathBase, { recursive: true });
			} catch {}
		});
		it(
			'generates valid LN and MUI binaries which Windows recognizes',
			async () => {
				const binBase = loadExeBinary('MultiLangApp', platform);
				const exe = NtExecutable.from(binBase);
				const res = NtExecutableResource.from(exe);

				const result = makeMuiResourcesFromSingleExecutable(
					res,
					[16],
					[16, 3, 6, 14],
					1033,
					exe.is32bit(),
					1033
				);

				result.baseExecutableResource.outputResource(exe);
				const newBin = exe.generate();
				fs.writeFileSync(
					path.resolve(outputPathBase, 'TestSplit.exe'),
					Buffer.from(newBin)
				);

				for (const [langTag, executable] of result.muiExecutables) {
					const newBin = executable.generate();
					fs.mkdirSync(path.resolve(outputPathBase, langTag), {
						recursive: true,
					});
					fs.writeFileSync(
						path.resolve(
							outputPathBase,
							langTag,
							'TestSplit.exe.mui'
						),
						Buffer.from(newBin)
					);
				}

				// We run test code in the separated process to avoid using cache for system DLLs
				await runTestWorker(
					'en-US',
					path.resolve(outputPathBase, 'TestSplit.exe'),
					path.resolve(
						__TEST_INPUT_ROOT__,
						'MultiLangApp',
						'icon1_en.ico'
					),
					'Hello'
				);
				await runTestWorker(
					'ja-JP',
					path.resolve(outputPathBase, 'TestSplit.exe'),
					path.resolve(
						__TEST_INPUT_ROOT__,
						'MultiLangApp',
						'icon1_ja.ico'
					),
					'こんにちは'
				);
			},
			isDebuggerAttached() ? 120000 : 5000
		);
	});
});

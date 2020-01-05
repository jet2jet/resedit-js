/// <reference types='jest' />

import * as crypto from 'crypto';
import * as path from 'path';

import {
	loadCert,
	loadExeBinary,
	loadPrivatePem,
	runExec,
	writeBinary,
} from '../util/fs';
import NtExecutable from '@/NtExecutable';
import { generateExecutableWithSign, SignerObject } from '@/sign';

const platform = __TEST_PLATFORM__;

const CERT_KEY_NAME = 'test.cer';
const CERT_KEY_NAME_WITH_INTERMEDIATE = 'testsub.p7b';
const PRIVATE_KEY_NAME = 'test';
const PRIVATE_KEY_NAME_WITH_INTERMEDIATE = 'testsub';
const VERIFY_TOOL = path.resolve(
	__TEST_TOOL_ROOT__,
	'VerifyTrust',
	'x64',
	'VerifyTrust.exe'
);

async function encryptDataBase(
	privFile: string,
	dataIterator: Iterator<ArrayBuffer, void>
) {
	const pkey: crypto.RsaPrivateKey = {
		key: loadPrivatePem(privFile),
	};

	const binArray: Buffer[] = [];
	let totalLength = 0;
	while (true) {
		const it = dataIterator.next();
		if (it.done) {
			break;
		}
		binArray.push(Buffer.from(it.value));
		totalLength += it.value.byteLength;
		await 0;
	}
	return crypto.privateEncrypt(pkey, Buffer.concat(binArray, totalLength));
}

// simple SignerObject (using Node.js crypto API)
const signerObjectBase: SignerObject = {
	getDigestAlgorithm() {
		return 'sha1';
	},
	getEncryptionAlgorithm() {
		return 'rsa';
	},
	getPublicKeyData() {
		throw new Error('Unimplemented');
	},
	async digestData(dataIterator) {
		const hash = crypto.createHash('sha1');
		while (true) {
			const it = dataIterator.next();
			if (it.done) {
				break;
			}
			await hash.update(Buffer.from(it.value));
		}
		return hash.digest();
	},
	encryptData() {
		throw new Error('Unimplemented');
	},
};

describe('generateExecutableWithSign', () => {
	const CERT_PATTERNS: Array<[string, string, string]> = [
		['.cer', CERT_KEY_NAME, PRIVATE_KEY_NAME],
		[
			'.p7b',
			CERT_KEY_NAME_WITH_INTERMEDIATE,
			PRIVATE_KEY_NAME_WITH_INTERMEDIATE,
		],
	];
	it.each(CERT_PATTERNS)(
		'should sign and return an executable validated by Windows (format: %s)',
		async (_, certFile, privFile) => {
			// use executable with resource
			const appName = 'ReadVersionApp_HasVersion';
			const signerObject: SignerObject = {
				...signerObjectBase,
				getPublicKeyData() {
					return loadCert(certFile);
				},
				encryptData(dataIterator) {
					return encryptDataBase(privFile, dataIterator);
				},
			};

			const binBase = loadExeBinary(appName, platform);
			const exe = NtExecutable.from(binBase, { ignoreCert: true });

			const newBin = await generateExecutableWithSign(exe, signerObject);

			const tempExe = path.resolve(
				__TEST_TEMPDIR_ROOT__,
				'sign',
				platform,
				`${appName}.exe`
			);
			writeBinary(tempExe, newBin);

			const result = runExec(VERIFY_TOOL, [tempExe]);
			const resultLines = result
				.replace(/(?:\r\n|[\r\n])$/g, '')
				.split(/\r\n|[\r\n]/g);

			const ra = /^Result:([0-9]+)$/.exec(resultLines[0]);
			if (!ra) {
				fail(`Unexpected output from VerifyTool: ${result}`);
			}
			let resultValue = Number(ra[1]);
			// ignore 2148204809 (CERT_E_UNTRUSTEDROOT)
			if (resultValue === 2148204809) {
				resultValue = 0;
			}
			expect(resultValue).toBe(0);
		}
	);
});
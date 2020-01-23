const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const ResEdit = require('../../dist');
/** @typedef {import('../../dist').SignerObject} SignerObject */

const INPUT_DIR = path.resolve(__dirname, '../../test/input');
const WORK_DIR = path.resolve(__dirname, '../../.work');

const SRC_EXE = path.resolve(
	INPUT_DIR,
	'LoadIconApp_HasIcon/x64/LoadIconApp_HasIcon.exe'
);
const DEST_EXE = path.resolve(WORK_DIR, 'LoadIconApp_HasIcon.sign.exe');
const CERT = path.resolve(INPUT_DIR, 'certs/test.cer');
const PRIVATE_KEY_PEM = path.resolve(INPUT_DIR, 'certs/test.priv.pem');

// TSA server to make timestamp data
const TIMESTAMP_SERVER = 'https://freetsa.org/tsr';

/**
 * Requests to TSA.
 * @param {ArrayBuffer} data binary data of TSQ
 * @return {Promise<Buffer>} response from TSA
 */
function requestTimestamp(data) {
	return new Promise((resolve, reject) => {
		const bin = Buffer.from(data);
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/timestamp-query',
				'Content-Length': bin.byteLength,
			},
		};
		const req = https.request(TIMESTAMP_SERVER, options, res => {
			const results = [];
			res.on('data', chunk => {
				results.push(chunk);
			});
			res.on('end', () => {
				resolve(Buffer.concat(results));
			});
		});
		req.write(bin);
		req.end();

		req.on('error', e => reject(e));
	});
}

function main() {
	const executable = ResEdit.NtExecutable.from(fs.readFileSync(SRC_EXE), {
		ignoreCert: true,
	});

	/** @type {SignerObject} */
	const signerObject = {
		getDigestAlgorithm() {
			return 'sha1';
		},
		getEncryptionAlgorithm() {
			return 'rsa';
		},
		getCertificateData() {
			return fs.readFileSync(CERT);
		},
		// digestData and encryptData must return PromiseLike object, so
		// this example uses async method
		async digestData(dataIterator) {
			const hash = crypto.createHash('sha1');
			while (true) {
				const it = dataIterator.next();
				if (it.done) {
					break;
				}
				// NOTE: hash.update is not an async method, but use 'await' here for an example only.
				await hash.update(Buffer.from(it.value));
			}
			return hash.digest();
		},
		async encryptData(dataIterator) {
			const pkey = {
				key: fs.readFileSync(PRIVATE_KEY_PEM, 'utf8'),
			};

			const binArray = [];
			let totalLength = 0;
			while (true) {
				const it = dataIterator.next();
				if (it.done) {
					break;
				}
				binArray.push(Buffer.from(it.value));
				totalLength += it.value.byteLength;
				// NOTE: Use 'await' here for an example only.
				await 0;
			}
			return crypto.privateEncrypt(
				pkey,
				Buffer.concat(binArray, totalLength)
			);
		},
		// If timestamp is not necessary, this method can be omitted.
		timestampData(data) {
			// Promise with 'Buffer' object can be returned here
			return requestTimestamp(data);
		},
	};

	console.log('Make sign...');
	ResEdit.generateExecutableWithSign(executable, signerObject).then(
		newBin => {
			const dir = path.dirname(DEST_EXE);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
			}
			fs.writeFileSync(DEST_EXE, Buffer.from(newBin));

			console.log(`Done. (exe = '${DEST_EXE}')`);
			process.exit(0);
		},
		e => {
			console.error('Error:', e);
			process.exit(1);
		}
	);
}

main();

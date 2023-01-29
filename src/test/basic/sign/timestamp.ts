import {
	createTimestampRequest,
	pickSignedDataFromTimestampResponse,
} from '@/sign/timestamp.js';
import AlgorithmIdentifier from '@/sign/data/AlgorithmIdentifier.js';
import { OID_SHA1_NO_SIGN } from '@/sign/data/KnownOids.js';

describe('createTimestampRequest', () => {
	// prettier-ignore
	const inData = new Uint8Array([
		0x67,0x7A,0x34,0xDB,0x38,0x35,0xDA,0x32,0x5E,0x3A,0x8E,0x04,0x43,0xDD,0x37,0xDC,
		0x1C,0x59,0xA1,0x39
	]);
	// prettier-ignore
	const outData = new Uint8Array([
		0x30,0x29,0x02,0x01,0x01,0x30,0x21,0x30,0x09,0x06,0x05,0x2B,0x0E,0x03,0x02,0x1A,
		0x05,0x00,0x04,0x14,0x67,0x7A,0x34,0xDB,0x38,0x35,0xDA,0x32,0x5E,0x3A,0x8E,0x04,
		0x43,0xDD,0x37,0xDC,0x1C,0x59,0xA1,0x39,0x01,0x01,0xFF
	]);

	it('should make valid request data', () => {
		const req = createTimestampRequest(
			inData,
			new AlgorithmIdentifier(OID_SHA1_NO_SIGN)
		);
		expect(new Uint8Array(req)).toEqual(outData);
	});
});

describe('pickSignedDataFromTimestampResponse', () => {
	// prettier-ignore
	const inData = new Uint8Array([
		0x30,0x16,0x30,0x03,0x02,0x01,0x00,0x30,0x0F,0x06,0x09,0x2A,0x86,0x48,0x86,0xF7,
		0x0D,0x01,0x07,0x02,0xA0,0x02,0x30,0x00
	]);
	// prettier-ignore
	const outData = new Uint8Array([
		0x30,0x00
	]);

	it('should pick singedData binary from timestamp response', () => {
		const bin = pickSignedDataFromTimestampResponse(inData);
		expect(new Uint8Array(bin)).toEqual(outData);
	});
});

import { RawDERObject } from '@/sign/data/DERObject.js';
import {
	arrayToDERSet,
	makeDERBMPString,
	makeDERIA5String,
	makeDERLength,
	makeDEROctetString,
	makeDERSequence,
	makeDERTaggedData,
} from '@/sign/data/derUtil.js';

describe('arrayToDERSet', () => {
	it('should make valid DER (with no items)', () => {
		expect(arrayToDERSet([])).toEqual([0x31, 0x00]);
	});
	it('should make valid DER (with one number[] item)', () => {
		expect(arrayToDERSet([[0x05, 0x00]])).toEqual([0x31, 0x02, 0x05, 0x00]);
	});
	it('should make valid DER (with two number[] items)', () => {
		expect(
			arrayToDERSet([
				[0x04, 0x03, 0xab, 0xcd, 0xef],
				[0x05, 0x00],
			])
		).toEqual([0x31, 0x07, 0x04, 0x03, 0xab, 0xcd, 0xef, 0x05, 0x00]);
	});
	it('should make valid DER (with one DERObject item)', () => {
		expect(arrayToDERSet([new RawDERObject([0x05, 0x00])])).toEqual([
			0x31, 0x02, 0x05, 0x00,
		]);
	});
	it('should make valid DER (with two DERObject items)', () => {
		expect(
			arrayToDERSet([
				new RawDERObject([0x04, 0x03, 0xab, 0xcd, 0xef]),
				new RawDERObject([0x05, 0x00]),
			])
		).toEqual([0x31, 0x07, 0x04, 0x03, 0xab, 0xcd, 0xef, 0x05, 0x00]);
	});
	it('should make valid DER (with complex items)', () => {
		expect(
			arrayToDERSet([
				new RawDERObject([0x04, 0x03, 0xab, 0xcd, 0xef]),
				[0x05, 0x00],
			])
		).toEqual([0x31, 0x07, 0x04, 0x03, 0xab, 0xcd, 0xef, 0x05, 0x00]);
	});
});

describe('makeDERBMPString', () => {
	it('should make valid DER', () => {
		expect(makeDERBMPString('FooBar')).toEqual([
			0x1e, 0x0c, 0x00, 0x46, 0x00, 0x6f, 0x00, 0x6f, 0x00, 0x42, 0x00,
			0x61, 0x00, 0x72,
		]);
	});
});

describe('makeDERIA5String', () => {
	it('should make valid DER', () => {
		expect(makeDERIA5String('FooBar')).toEqual([
			0x16, 0x06, 0x46, 0x6f, 0x6f, 0x42, 0x61, 0x72,
		]);
	});
});

describe('makeDERLength', () => {
	it('should make length octet binary (with value: <128)', () => {
		expect(makeDERLength(100)).toEqual([0x64]);
	});
	it('should make length octet binary (with value: 128<=x<256)', () => {
		expect(makeDERLength(200)).toEqual([0x81, 0xc8]);
	});
	it('should make length octet binary (with value: 256<=x<65536)', () => {
		expect(makeDERLength(20000)).toEqual([0x82, 0x4e, 0x20]);
	});
});

describe('makeDEROctetString', () => {
	it('should make valid DER (with number[])', () => {
		expect(makeDEROctetString([0x01, 0x10, 0x80, 0xde])).toEqual([
			0x04, 0x04, 0x01, 0x10, 0x80, 0xde,
		]);
	});
	it('should make valid DER (with Uint8Array)', () => {
		expect(
			makeDEROctetString(new Uint8Array([0x01, 0x10, 0x80, 0xde]))
		).toEqual([0x04, 0x04, 0x01, 0x10, 0x80, 0xde]);
	});
});

describe('makeDERSequence', () => {
	it('should make valid DER (short length)', () => {
		expect(makeDERSequence([0x04, 0x03, 0x02, 0x01, 0x00])).toEqual([
			0x30, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00,
		]);
	});
	it('should make valid DER (long length)', () => {
		const tempData = new Uint8Array(0x81);
		tempData[0] = 0x04;
		tempData[1] = 0x7f;
		const tempDataNum = ([] as number[]).slice.call(
			tempData as unknown as number[]
		);
		expect(makeDERSequence(tempDataNum)).toEqual(
			[0x30, 0x81, 0x81].concat(tempDataNum)
		);
	});
});

describe('makeDERTaggedData', () => {
	it('should make valid DER (short length)', () => {
		expect(makeDERTaggedData(1, [0x04, 0x03, 0x02, 0x01, 0x00])).toEqual([
			0xa1, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00,
		]);
	});
	it('should make valid DER (long length)', () => {
		const tempData = new Uint8Array(0x81);
		tempData[0] = 0x04;
		tempData[1] = 0x7f;
		const tempDataNum = ([] as number[]).slice.call(
			tempData as unknown as number[]
		);
		expect(makeDERTaggedData(1, tempDataNum)).toEqual(
			[0xa1, 0x81, 0x81].concat(tempDataNum)
		);
	});
});

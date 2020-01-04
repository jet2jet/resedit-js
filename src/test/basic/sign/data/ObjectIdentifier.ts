import ObjectIdentifier from '@/sign/data/ObjectIdentifier';

describe('ObjectIdentifier', () => {
	it('should make DER correctly (with only <128 values)', () => {
		const oid = new ObjectIdentifier([1, 2, 3, 4, 5]);
		expect(oid.toDER()).toEqual([0x6, 0x4, 0x2a, 0x3, 0x4, 0x5]);
	});
	it('should make DER correctly (with 128<=x<128**2 values)', () => {
		const oid = new ObjectIdentifier([1, 2, 10000, 5]);
		expect(oid.toDER()).toEqual([0x6, 0x4, 0x2a, 0xce, 0x10, 0x5]);
	});
	it('should make DER correctly (with 128**2<=x<128**3 values)', () => {
		const oid = new ObjectIdentifier([1, 2, 100000, 5]);
		expect(oid.toDER()).toEqual([0x6, 0x5, 0x2a, 0x86, 0x8d, 0x20, 0x5]);
	});
});

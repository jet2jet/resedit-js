import DERObject from './DERObject.js';
import IssuerAndSerialNumber from './IssuerAndSerialNumber.js';
import {
	makeDERSequence,
	arrayToDERSet,
	makeDEROctetString,
} from './derUtil.js';
import AlgorithmIdentifier from './AlgorithmIdentifier.js';
import Attribute from './Attribute.js';

export default class SignerInfo implements DERObject {
	constructor(
		public version: number,
		public issuerAndSerialNumber: IssuerAndSerialNumber,
		public digestAlgorithm: AlgorithmIdentifier,
		public digestEncryptionAlgorithm: AlgorithmIdentifier,
		public encryptedDigest: Uint8Array,
		public authenticatedAttributes?: Attribute[],
		public unauthenticatedAttributes?: Attribute[]
	) {}

	public toDER(): number[] {
		let r = [0x02, 0x01, this.version & 0xff]
			.concat(this.issuerAndSerialNumber.toDER())
			.concat(this.digestAlgorithm.toDER());
		if (
			this.authenticatedAttributes &&
			this.authenticatedAttributes.length > 0
		) {
			const a = arrayToDERSet(this.authenticatedAttributes);
			// [0] IMPLICIT
			a[0] = 0xa0;
			r = r.concat(a);
		}
		r = r
			.concat(this.digestEncryptionAlgorithm.toDER())
			.concat(makeDEROctetString(this.encryptedDigest));
		if (
			this.unauthenticatedAttributes &&
			this.unauthenticatedAttributes.length > 0
		) {
			const u = arrayToDERSet(this.unauthenticatedAttributes);
			// [1] IMPLICIT
			u[0] = 0xa1;
			r = r.concat(u);
		}
		return makeDERSequence(r);
	}
}

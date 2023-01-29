import DERObject from './DERObject.js';
import { makeDERSequence } from './derUtil.js';

export default class IssuerAndSerialNumber implements DERObject {
	constructor(public issuer: DERObject, public serialNumber: DERObject) {}

	public toDER(): number[] {
		return makeDERSequence(
			this.issuer.toDER().concat(this.serialNumber.toDER())
		);
	}
}

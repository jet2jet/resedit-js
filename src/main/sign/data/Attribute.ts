import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import { makeDERSequence, arrayToDERSet } from './derUtil.js';

export default class Attribute implements DERObject {
	constructor(
		public attrType: ObjectIdentifier,
		public attrValues: DERObject[]
	) {}

	public toDER(): number[] {
		return makeDERSequence(
			this.attrType.toDER().concat(arrayToDERSet(this.attrValues))
		);
	}
}

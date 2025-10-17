import type DERObject from './DERObject.js';
import { makeDERSequence, arrayToDERSet } from './derUtil.js';
import type ObjectIdentifier from './ObjectIdentifier.js';

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

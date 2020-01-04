import DERObject from './DERObject';
import ObjectIdentifier from './ObjectIdentifier';
import { makeDERSequence, arrayToDERSet } from './derUtil';

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

import DERObject from './DERObject';
import ObjectIdentifier from './ObjectIdentifier';
import { makeDERSequence } from './derUtil';

export default class AlgorithmIdentifier implements DERObject {
	constructor(public algorithm: ObjectIdentifier) {}

	public toDER(): number[] {
		const r = this.algorithm.toDER();
		return makeDERSequence(
			r.concat(
				// parameters is not used now
				[0x05, 0x00]
			)
		);
	}
}

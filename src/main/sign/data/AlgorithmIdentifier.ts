import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import { makeDERSequence } from './derUtil.js';

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

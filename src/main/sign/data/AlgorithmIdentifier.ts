import type DERObject from './DERObject.js';
import { makeDERSequence } from './derUtil.js';
import type ObjectIdentifier from './ObjectIdentifier.js';

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

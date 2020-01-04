import AlgorithmIdentifier from './AlgorithmIdentifier';
import DERObject from './DERObject';
import { makeDERSequence, makeDEROctetString } from './derUtil';

export default class DigestInfo implements DERObject {
	constructor(
		public digestAlgorithm: AlgorithmIdentifier,
		public digest: ArrayBuffer | ArrayBufferView
	) {}

	public toDER(): number[] {
		const digest = this.digest;
		let digestArray: Uint8Array;
		if ('buffer' in digest) {
			digestArray = new Uint8Array(
				digest.buffer,
				digest.byteOffset,
				digest.byteLength
			);
		} else {
			digestArray = new Uint8Array(digest);
		}

		const derData = this.digestAlgorithm
			.toDER()
			.concat(makeDEROctetString(digestArray));
		return makeDERSequence(derData);
	}
}

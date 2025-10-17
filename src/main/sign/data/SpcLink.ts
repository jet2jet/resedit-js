import type DERObject from './DERObject.js';
import { RawDERObject } from './DERObject.js';
import {
	makeDERTaggedData,
	makeDERIA5String,
	makeDERBMPString,
} from './derUtil.js';

/**
 * Abstract data SpcLink. Must use either `SpcLinkUrl` or `SpcLinkFile` instead.
 */
export default abstract class SpcLink implements DERObject {
	constructor(
		private readonly tag: number,
		public value: DERObject
	) {}

	public toDER(): number[] {
		const v = this.value.toDER();
		if (this.tag === 2) {
			// EXPLICIT
			return makeDERTaggedData(this.tag, v);
		} else {
			// IMPLICIT
			v[0] = 0x80 + this.tag;
			return v;
		}
	}
}

export class SpcLinkUrl extends SpcLink {
	constructor(url: string) {
		super(0, new RawDERObject(makeDERIA5String(url)));
	}
}

// moniker is not supported now (currently unused)

export class SpcLinkFile extends SpcLink {
	constructor(file: string) {
		const v = makeDERBMPString(file);
		// [0] IMPLICIT BMPSTRING
		v[0] = 0x80;
		super(2, new RawDERObject(v));
	}
}

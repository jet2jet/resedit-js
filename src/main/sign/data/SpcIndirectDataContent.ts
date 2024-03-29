import ContentInfo from './ContentInfo.js';
import type DigestInfo from './DigestInfo.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import type DERObject from './DERObject.js';
import { makeDERSequence } from './derUtil.js';

// prettier-ignore
export const SPC_INDIRECT_DATA_OBJID = new ObjectIdentifier([1,3,6,1,4,1,311,2,1,4]);

export class SpcAttributeTypeAndOptionalValue<
	TValue extends DERObject = DERObject
> {
	constructor(public type: ObjectIdentifier, public value: TValue) {}

	public toDER(): number[] {
		return makeDERSequence(this.type.toDER().concat(this.value.toDER()));
	}
}

export default class SpcIndirectDataContent implements DERObject {
	constructor(
		public data: SpcAttributeTypeAndOptionalValue,
		public messageDigest: DigestInfo
	) {}

	public toDER(): number[] {
		return makeDERSequence(this.toDERWithoutHeader());
	}

	// this is used for calculating 'messageDigest'
	public toDERWithoutHeader(): number[] {
		return this.data.toDER().concat(this.messageDigest.toDER());
	}
}

export class SpcIndirectDataContentInfo extends ContentInfo<SpcIndirectDataContent> {
	constructor(content: SpcIndirectDataContent) {
		super(SPC_INDIRECT_DATA_OBJID, content);
	}
}

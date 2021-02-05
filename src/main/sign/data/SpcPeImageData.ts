import DERObject from './DERObject';
import ObjectIdentifier from './ObjectIdentifier';
import { SpcAttributeTypeAndOptionalValue } from './SpcIndirectDataContent';
import SpcLink from './SpcLink';
import { makeDERSequence, makeDERTaggedData } from './derUtil';

// prettier-ignore
export const SPC_PE_IMAGE_DATA_OBJID = new ObjectIdentifier([1,3,6,1,4,1,311,2,1,15]);

export class SpcPeImageAttributeTypeAndOptionalValue extends SpcAttributeTypeAndOptionalValue<SpcPeImageData> {
	constructor(value: SpcPeImageData) {
		super(SPC_PE_IMAGE_DATA_OBJID, value);
	}
}

export const enum SpcPeImageFlags {
	IncludeResources = 0,
	IncludeDebugInfo = 1,
	IncludeImportAddressTable = 2,
}

export default class SpcPeImageData implements DERObject {
	constructor(public flags: SpcPeImageFlags, public file: SpcLink) {}

	public toDER(): number[] {
		return makeDERSequence(
			[0x03, 0x01, this.flags & 0xff].concat(
				// undocumented -- SpcLink must be tagged
				makeDERTaggedData(0, this.file.toDER())
			)
		);
	}
}

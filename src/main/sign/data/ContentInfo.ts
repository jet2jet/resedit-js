import DERObject from './DERObject.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import { makeDERSequence, makeDERTaggedData } from './derUtil.js';

// abstract
export default class ContentInfo<TContent extends DERObject = DERObject>
	implements DERObject
{
	constructor(
		public contentType: ObjectIdentifier,
		public content: TContent
	) {}

	public toDER(): number[] {
		return makeDERSequence(
			this.contentType
				.toDER()
				.concat(makeDERTaggedData(0, this.content.toDER()))
		);
	}
}

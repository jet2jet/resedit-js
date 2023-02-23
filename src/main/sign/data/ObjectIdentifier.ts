import type DERObject from './DERObject.js';
import { makeDERLength } from './derUtil.js';

export default class ObjectIdentifier implements DERObject {
	public value: number[];

	constructor(value: number[] | string) {
		if (typeof value === 'string') {
			this.value = value.split(/\./g).map((s) => Number(s));
		} else {
			this.value = value;
		}
	}

	public toDER(): number[] {
		const id = this.value;
		const r: number[] = [];

		// first byte will be (x * 40 + y) for 'x.y.****'
		r.push(id[0] * 40 + id[1]);

		for (let i = 2; i < id.length; ++i) {
			// store as variable-length value
			let val = id[i];
			let isFirst = true;
			const insertPos = r.length;
			while (true) {
				let v = val & 0x7f;
				if (!isFirst) {
					v += 0x80;
				}
				r.splice(insertPos, 0, v);
				if (val < 0x80) {
					break;
				}
				isFirst = false;
				val = Math.floor(val / 0x80);
			}
		}

		return [0x06].concat(makeDERLength(r.length)).concat(r);
	}
}

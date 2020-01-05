import DERObject from './DERObject';

export function makeDERLength(length: number): number[] {
	if (length < 0x80) {
		return [length];
	}
	const r: number[] = [];
	while (true) {
		r.push(length & 0xff);
		if (length < 0x100) {
			break;
		}
		length >>= 8;
	}
	r.push(0x80 + r.length);
	return r.reverse();
}

export function makeDERIA5String(text: string): number[] {
	// convert to char-code array and filter to [0-127]
	const r = [].map
		.call<string[], [(v: string) => number], number[]>(
			(text as unknown) as string[],
			c => c.charCodeAt(0)
		)
		.filter(n => n < 128);
	return [0x16].concat(makeDERLength(r.length)).concat(r);
}

export function makeDERBMPString(text: string): number[] {
	// convert to char-code array
	// NOTE: In ECMAScript `charCodeAt` returns surrogate pair for >=0x10000 codes,
	//   and surrogate pair is valid for BMPString data
	const r = [].map.call<string[], [(v: string) => number], number[]>(
		(text as unknown) as string[],
		c => c.charCodeAt(0)
	);
	const ua = new Uint8Array(r.length * 2);
	const dv = new DataView(ua.buffer);
	// store codes as big-endian
	r.forEach((v, i) => dv.setUint16(i * 2, v, false));
	return [0x1e].concat(makeDERLength(ua.length)).concat(
		// convert Uint8Array to number[] (not using spread operator)
		([] as number[]).slice.call((ua as unknown) as number[])
	);
}

export function makeDEROctetString(bin: number[] | Uint8Array): number[] {
	if (!(bin instanceof Array)) {
		// convert Uint8Array to number[] (not using spread operator)
		bin = ([] as number[]).slice.call((bin as unknown) as number[]);
	}
	return [0x04].concat(makeDERLength(bin.length)).concat(bin);
}

export function makeDERTaggedData(tag: number, body: number[]): number[] {
	return [0xa0 + tag].concat(makeDERLength(body.length)).concat(body);
}

export function makeDERSequence(body: number[]): number[] {
	return [0x30].concat(makeDERLength(body.length)).concat(body);
}

export function arrayToDERSet(items: Array<DERObject | number[]>) {
	const r = items.reduce<number[]>(
		(prev, item) =>
			prev.concat(item instanceof Array ? item : item.toDER()),
		[]
	);
	return [0x31].concat(makeDERLength(r.length)).concat(r);
}

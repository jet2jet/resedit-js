export default interface DERObject {
	toDER: () => number[];
}

export class RawDERObject implements DERObject {
	constructor(public data: number[] | Uint8Array) {}

	public toDER(): number[] {
		return ([] as number[]).slice.call((this.data as unknown) as number[]);
	}
}

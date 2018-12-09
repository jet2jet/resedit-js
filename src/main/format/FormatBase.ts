
export default abstract class FormatBase {
	protected constructor(protected readonly view: DataView) { }
	public copyTo(bin: ArrayBuffer, offset: number) {
		new Uint8Array(bin, offset, this.view.byteLength).set(
			new Uint8Array(this.view.buffer, this.view.byteOffset, this.view.byteLength)
		);
	}
	public get byteLength() {
		return this.view.byteLength;
	}
}

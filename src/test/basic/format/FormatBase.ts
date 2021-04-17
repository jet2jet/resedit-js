import FormatBase from '@/format/FormatBase';

class DummyFormat extends FormatBase {
	public constructor(view: DataView) {
		super(view);
	}
	public getView() {
		return this.view;
	}
}

describe('FormatBase', () => {
	const DEFAULT_SIZE = 16;
	it("should set protected 'view' field", () => {
		const view = new DataView(new ArrayBuffer(DEFAULT_SIZE));
		expect(new DummyFormat(view).getView()).toBe(view);
	});
	it('should work byteLength', () => {
		const view = new DataView(new ArrayBuffer(DEFAULT_SIZE));
		expect(new DummyFormat(view).byteLength).toEqual(DEFAULT_SIZE);
	});
	it('should work copyTo', () => {
		const OFFSET = 8;
		const data = new Uint8Array([...Array(DEFAULT_SIZE)].map((_, i) => i));
		const bin = new ArrayBuffer(OFFSET + DEFAULT_SIZE);
		new DummyFormat(
			new DataView(data.buffer, data.byteOffset, data.byteLength)
		).copyTo(bin, OFFSET);
		expect(new Uint8Array(bin, OFFSET)).toEqual(data);
	});
});

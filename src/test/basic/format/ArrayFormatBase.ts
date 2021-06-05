import ArrayFormatBase from '@/format/ArrayFormatBase';
import FormatBase from '@/format/FormatBase';

jest.mock('@/format/FormatBase');

interface DummyData {
	id: string;
}

const DUMMY_DATA: DummyData[] = [
	{ id: 'Data1' },
	{ id: 'Data2' },
	{ id: 'Data3' },
];

class DummyArrayFormatBase extends ArrayFormatBase<DummyData> {
	public readonly length: number = DUMMY_DATA.length;

	public get = jest.fn(
		(index: number): Readonly<DummyData> => {
			return DUMMY_DATA[index];
		}
	);
	public set = jest.fn();

	public constructor(view: DataView) {
		super(view);
	}
}

describe('ArrayFormatBase', () => {
	const DEFAULT_SIZE = 16;
	const dummyData = new ArrayBuffer(DEFAULT_SIZE);
	const dummyDataView = new DataView(dummyData);

	it('should inherit FormatBase', () => {
		const a = new DummyArrayFormatBase(dummyDataView);
		expect(a).toBeInstanceOf(FormatBase);
		expect(FormatBase).toHaveBeenCalledWith(dummyDataView);
	});
	describe('forEach', () => {
		it('should use result of get', () => {
			const a = new DummyArrayFormatBase(dummyDataView);
			a.forEach((value, index, base) => {
				expect(base).toBe(a);
				expect(value).toEqual(DUMMY_DATA[index]);
			});
			expect(a.get).toHaveBeenCalledTimes(a.length);
			for (let i = 0; i < a.length; ++i) {
				expect(a.get).toHaveBeenCalledWith(i);
			}
		});
	});
	describe('_iterator', () => {
		it('should use result of get', () => {
			const a = new DummyArrayFormatBase(dummyDataView);
			const iter = a._iterator();
			let i = 0;
			while (true) {
				const r = iter.next();
				if (r.done) {
					break;
				}
				expect(r.value).toEqual(DUMMY_DATA[i]);
				expect(a.get).toHaveBeenCalledWith(i);
				++i;
			}
			expect(i).toEqual(a.length);
			expect(a.get).toHaveBeenCalledTimes(a.length);
		});
	});
	describe('Symbol.iterator', () => {
		it('should be iterable', () => {
			const a = new DummyArrayFormatBase(dummyDataView);
			const x = Array.from(a); // Array.format uses [Symbol.iterator]
			expect(x).toEqual(DUMMY_DATA);
		});
	});
});

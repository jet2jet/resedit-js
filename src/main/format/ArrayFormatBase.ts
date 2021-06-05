import FormatBase from './FormatBase';

/** abstract class that support array-like methods and 'for...of' operation */
abstract class ArrayFormatBase<T> extends FormatBase {
	protected constructor(view: DataView) {
		super(view);
	}

	public abstract readonly length: number;
	public abstract get(index: number): Readonly<T>;
	public abstract set(index: number, data: T): void;
	public forEach(
		callback: (value: T, index: number, base: this) => void
	): void {
		const len = this.length;
		const a: T[] = [];
		a.length = len;
		for (let i = 0; i < len; ++i) {
			a[i] = this.get(i);
		}
		for (let i = 0; i < len; ++i) {
			callback(a[i], i, this);
		}
	}
	public _iterator(): Iterator<Readonly<T>> {
		return new (class {
			private i: number = 0;
			constructor(private readonly base: ArrayFormatBase<T>) {}
			public next(): IteratorResult<Readonly<T>, void> {
				if (this.i === this.base.length) {
					return {
						value: undefined,
						done: true,
					};
				} else {
					return {
						value: this.base.get(this.i++),
						done: false,
					};
				}
			}
		})(this);
	}
}
interface ArrayFormatBase<T> {
	[Symbol.iterator]: () => Iterator<Readonly<T>>;
}
/* istanbul ignore else */
if (typeof Symbol !== 'undefined') {
	(ArrayFormatBase.prototype as any)[(Symbol as any).iterator] =
		ArrayFormatBase.prototype._iterator;
}
export default ArrayFormatBase;

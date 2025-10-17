export type FieldNames<
	TFields extends ReadonlyArray<readonly [string | null, number]>,
> = TFields extends ReadonlyArray<readonly [infer F, number]> ? F : never;
export type ExcludeNullField<
	FieldType extends readonly [string | null, number],
> = FieldType extends readonly [null, number] ? never : FieldType;

export function getFieldOffset<
	TFields extends ReadonlyArray<readonly [string | null, number]>,
>(fields: TFields, fieldName: FieldNames<TFields> | null): number {
	let o = 0;
	for (const f of fields) {
		if (f[0] === fieldName) {
			return o;
		}
		o += f[1];
	}
	return o;
}

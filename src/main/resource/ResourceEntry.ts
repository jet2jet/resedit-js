export interface ResourceEntryBaseType<
	TType extends string | number,
	TID extends string | number,
	TLang extends string | number
> {
	/**
	 * The resource type name or numeric value.
	 * For well-known type (such as `RT_ICON`), this value must be the predefined numeric value.
	 */
	type: TType;
	/** The ID of resource data. */
	id: TID;
	/**
	 * The language value of resource data.
	 * According to specification, this value can be string, but
	 * typically this value would be LANGID (numeric) value.
	 */
	lang: TLang;
	/**
	 * The code page value for strings within the resource data.
	 * Typically this value would be the Unicode code page '1200'.
	 */
	codepage: number;
	/** The actual resource data. */
	bin: ArrayBuffer;
	/** (used by output) */
	offset?: number;
}

export type ResourceEntryT<
	TType extends string | number
> = ResourceEntryBaseType<TType, string | number, string | number>;

export type ResourceEntryTT<
	TType extends string | number,
	TID extends string | number
> = ResourceEntryBaseType<TType, TID, string | number>;

/** Raw resource entry data */
type ResourceEntry = ResourceEntryBaseType<
	string | number,
	string | number,
	string | number
>;
export default ResourceEntry;

export interface ResourceEntryBaseType<
	TType extends string | number,
	TID extends string | number,
	TLang extends string | number
> {
	type: TType;
	id: TID;
	lang: TLang;
	codepage: number;
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

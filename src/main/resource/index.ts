import { type Type } from 'pe-library';
import IconGroupEntry, { type IconGroupItem } from './IconGroupEntry.js';
import StringTable from './StringTable.js';
import VersionFileFlags from './VersionFileFlags.js';
import VersionFileOS from './VersionFileOS.js';
import {
	VersionFileDriverSubtype,
	VersionFileFontSubtype,
} from './VersionFileSubtypes.js';
import VersionFileType from './VersionFileType.js';
import VersionInfo, {
	type VersionInfoCreateParam,
	type VersionFixedInfo,
	type VersionStringTable,
	type VersionStringValues,
	type VersionTranslation,
} from './VersionInfo.js';

type ResourceEntry = Type.ResourceEntry;
type ResourceEntryBaseType<
	TType extends string | number,
	TID extends string | number,
	TLang extends string | number,
> = Type.ResourceEntryBaseType<TType, TID, TLang>;

export {
	IconGroupEntry,
	type IconGroupItem,
	type ResourceEntry,
	type ResourceEntryBaseType,
	StringTable,
	type VersionInfoCreateParam,
	VersionFileFlags,
	VersionFileOS,
	VersionFileDriverSubtype,
	VersionFileFontSubtype,
	VersionFileType,
	type VersionFixedInfo,
	VersionInfo,
	type VersionStringTable,
	type VersionStringValues,
	type VersionTranslation,
};

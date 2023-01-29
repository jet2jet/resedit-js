import { Type } from 'pe-library';
import IconGroupEntry, { IconGroupItem } from './IconGroupEntry.js';
import StringTable from './StringTable.js';
import VersionFileFlags from './VersionFileFlags.js';
import VersionFileOS from './VersionFileOS.js';
import {
	VersionFileDriverSubtype,
	VersionFileFontSubtype,
} from './VersionFileSubtypes.js';
import VersionFileType from './VersionFileType.js';
import VersionInfo, {
	VersionInfoCreateParam,
	VersionFixedInfo,
	VersionStringTable,
	VersionStringValues,
	VersionTranslation,
} from './VersionInfo.js';

type ResourceEntry = Type.ResourceEntry;
type ResourceEntryBaseType<
	TType extends string | number,
	TID extends string | number,
	TLang extends string | number
> = Type.ResourceEntryBaseType<TType, TID, TLang>;

export {
	IconGroupEntry,
	IconGroupItem,
	ResourceEntry,
	ResourceEntryBaseType,
	StringTable,
	VersionInfoCreateParam,
	VersionFileFlags,
	VersionFileOS,
	VersionFileDriverSubtype,
	VersionFileFontSubtype,
	VersionFileType,
	VersionFixedInfo,
	VersionInfo,
	VersionStringTable,
	VersionStringValues,
	VersionTranslation,
};

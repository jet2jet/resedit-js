import { Type } from 'pe-library';
import IconGroupEntry, { IconGroupItem } from './IconGroupEntry';
import StringTable from './StringTable';
import VersionFileFlags from './VersionFileFlags';
import VersionFileOS from './VersionFileOS';
import {
	VersionFileDriverSubtype,
	VersionFileFontSubtype,
} from './VersionFileSubtypes';
import VersionFileType from './VersionFileType';
import VersionInfo, {
	VersionInfoCreateParam,
	VersionFixedInfo,
	VersionStringTable,
	VersionStringValues,
	VersionTranslation,
} from './VersionInfo';

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

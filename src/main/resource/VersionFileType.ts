/**
 * File type values used by VersionEntry.fixedInfo field.
 */
const VersionFileType = {
	Unknown: 0,
	App: 1,
	DLL: 2,
	Driver: 3,
	Font: 4,
	VxD: 5,
	StaticLibrary: 7,
} as const;
/**
 * File type values used by VersionEntry.fixedInfo field.
 */
type VersionFileType = (typeof VersionFileType)[keyof typeof VersionFileType];
export default VersionFileType;

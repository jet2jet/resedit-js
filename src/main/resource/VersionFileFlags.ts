
/**
 * Flag values used by VersionEntry.fixedInfo field.
 * Zero or more enum values are stored (with OR operator).
 */
enum VersionFileFlags {
	Debug = 1,
	Prerelease = 2,
	Patched = 4,
	PrivateBuild = 8,
	InfoInferred = 16,
	SpecialBuild = 32
}
export default VersionFileFlags;

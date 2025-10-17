/**
 * Flag values used by VersionEntry.fixedInfo field.
 * Zero or more enum values are stored (with OR operator).
 */
const VersionFileFlags = {
	Debug: 1,
	Prerelease: 2,
	Patched: 4,
	PrivateBuild: 8,
	InfoInferred: 16,
	SpecialBuild: 32,
} as const;
/**
 * Flag values used by VersionEntry.fixedInfo field.
 * Zero or more enum values are stored (with OR operator).
 */
type VersionFileFlags =
	(typeof VersionFileFlags)[keyof typeof VersionFileFlags];
export default VersionFileFlags;

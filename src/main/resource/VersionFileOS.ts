
/**
 * OS values used by VersionEntry.fixedInfo field.
 */
enum VersionFileOS {
	Unknown = 0,
	_Windows16 = 1,
	_PM16 = 2,
	_PM32 = 3,
	_Windows32 = 4,
	DOS = 0x10000,
	OS2_16 = 0x20000,
	OS2_32 = 0x30000,
	NT = 0x40000,

	DOS_Windows16 = 0x10001,
	DOS_Windows32 = 0x10004,
	NT_Windows32 = 0x40004,
	OS2_16_PM16 = 0x20002,
	OS2_32_PM32 = 0x30003
}
export default VersionFileOS;

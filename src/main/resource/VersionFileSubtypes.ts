const VersionFileDriverSubtype = {
	Unknown: 0,
	Printer: 1,
	Keyboard: 2,
	Language: 3,
	Display: 4,
	Mouse: 5,
	Network: 6,
	System: 7,
	Installable: 8,
	Sound: 9,
	Comm: 10,
	VersionedPrinter: 12,
} as const;
type VersionFileDriverSubtype =
	(typeof VersionFileDriverSubtype)[keyof typeof VersionFileDriverSubtype];
export { VersionFileDriverSubtype };

const VersionFileFontSubtype = {
	Unknown: 0,
	Raster: 1,
	Vector: 2,
	TrueType: 3,
} as const;
type VersionFileFontSubtype =
	(typeof VersionFileFontSubtype)[keyof typeof VersionFileFontSubtype];
export { VersionFileFontSubtype };

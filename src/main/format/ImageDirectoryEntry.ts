enum ImageDirectoryEntry {
	Export = 0,
	Import = 1,
	Resource = 2,
	Exception = 3,
	Certificate = 4,
	// alias
	Security = 4,
	BaseRelocation = 5,
	Debug = 6,
	Architecture = 7,
	GlobalPointer = 8,
	Tls = 9,
	TLS = 9, // alias
	LoadConfig = 10,
	BoundImport = 11,
	Iat = 12,
	IAT = 12, // alias
	DelayImport = 13,
	ComDescriptor = 14,
	COMDescriptor = 14, // alias
}
export default ImageDirectoryEntry;

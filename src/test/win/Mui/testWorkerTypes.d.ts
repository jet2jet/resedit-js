export interface TestParameter {
	languageTag: string;
	tempDir: string;
	exePath: string;
	expectedIconFile: string;
	expectedText: string;
}

export interface TestResult {
	resultOfSHGetFileInfoW?: boolean;
	isEqualIconBitmapMask?: boolean;
	isEqualIconBitmapColor?: boolean;
	isValidLnVersion?: boolean;
	isValidMuiVersion?: boolean;
	isValidLocalizedText?: boolean;
	errorMessage?: string;
}

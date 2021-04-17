import FormatBase from './FormatBase';

function getUint64LE(view: DataView, offset: number) {
	return (
		view.getUint32(offset + 4, true) * 0x100000000 +
		view.getUint32(offset, true)
	);
}
function setUint64LE(view: DataView, offset: number, val: number) {
	view.setUint32(offset, val & 0xffffffff, true);
	view.setUint32(offset + 4, Math.floor(val / 0x100000000), true);
}
function getUint64LEBigInt(view: DataView, offset: number) {
	/* istanbul ignore if */
	if (typeof BigInt === 'undefined') {
		throw new Error('BigInt not supported');
	}
	return (
		BigInt(0x100000000) * BigInt(view.getUint32(offset + 4, true)) +
		BigInt(view.getUint32(offset, true))
	);
}
function setUint64LEBigInt(view: DataView, offset: number, val: bigint) {
	/* istanbul ignore if */
	if (typeof BigInt === 'undefined') {
		throw new Error('BigInt not supported');
	}
	view.setUint32(offset, Number(val & BigInt(0xffffffff)), true);
	view.setUint32(
		offset + 4,
		Math.floor(Number((val / BigInt(0x100000000)) & BigInt(0xffffffff))),
		true
	);
}

export default class ImageOptionalHeader64 extends FormatBase {
	public static readonly size = 112;
	public static readonly DEFAULT_MAGIC = 0x20b;

	private constructor(view: DataView) {
		super(view);
	}

	public static from(bin: ArrayBuffer, offset = 0): ImageOptionalHeader64 {
		return new ImageOptionalHeader64(new DataView(bin, offset, 112));
	}
	public get magic(): number {
		return this.view.getUint16(0, true);
	}
	public set magic(val: number) {
		this.view.setUint16(0, val, true);
	}
	public get majorLinkerVersion(): number {
		return this.view.getUint8(2);
	}
	public set majorLinkerVersion(val: number) {
		this.view.setUint8(2, val);
	}
	public get minorLinkerVersion(): number {
		return this.view.getUint8(3);
	}
	public set minorLinkerVersion(val: number) {
		this.view.setUint8(3, val);
	}
	public get sizeOfCode(): number {
		return this.view.getUint32(4, true);
	}
	public set sizeOfCode(val: number) {
		this.view.setUint32(4, val, true);
	}
	public get sizeOfInitializedData(): number {
		return this.view.getUint32(8, true);
	}
	public set sizeOfInitializedData(val: number) {
		this.view.setUint32(8, val, true);
	}
	public get sizeOfUninitializedData(): number {
		return this.view.getUint32(12, true);
	}
	public set sizeOfUninitializedData(val: number) {
		this.view.setUint32(12, val, true);
	}
	public get addressOfEntryPoint(): number {
		return this.view.getUint32(16, true);
	}
	public set addressOfEntryPoint(val: number) {
		this.view.setUint32(16, val, true);
	}
	public get baseOfCode(): number {
		return this.view.getUint32(20, true);
	}
	public set baseOfCode(val: number) {
		this.view.setUint32(20, val, true);
	}

	public get imageBase(): number {
		return getUint64LE(this.view, 24);
	}
	public set imageBase(val: number) {
		setUint64LE(this.view, 24, val);
	}
	public get imageBaseBigInt(): bigint {
		return getUint64LEBigInt(this.view, 24);
	}
	public set imageBaseBigInt(val: bigint) {
		setUint64LEBigInt(this.view, 24, val);
	}
	public get sectionAlignment(): number {
		return this.view.getUint32(32, true);
	}
	public set sectionAlignment(val: number) {
		this.view.setUint32(32, val, true);
	}
	public get fileAlignment(): number {
		return this.view.getUint32(36, true);
	}
	public set fileAlignment(val: number) {
		this.view.setUint32(36, val, true);
	}
	public get majorOperatingSystemVersion(): number {
		return this.view.getUint16(40, true);
	}
	public set majorOperatingSystemVersion(val: number) {
		this.view.setUint16(40, val, true);
	}
	public get minorOperatingSystemVersion(): number {
		return this.view.getUint16(42, true);
	}
	public set minorOperatingSystemVersion(val: number) {
		this.view.setUint16(42, val, true);
	}
	public get majorImageVersion(): number {
		return this.view.getUint16(44, true);
	}
	public set majorImageVersion(val: number) {
		this.view.setUint16(44, val, true);
	}
	public get minorImageVersion(): number {
		return this.view.getUint16(46, true);
	}
	public set minorImageVersion(val: number) {
		this.view.setUint16(46, val, true);
	}
	public get majorSubsystemVersion(): number {
		return this.view.getUint16(48, true);
	}
	public set majorSubsystemVersion(val: number) {
		this.view.setUint16(48, val, true);
	}
	public get minorSubsystemVersion(): number {
		return this.view.getUint16(50, true);
	}
	public set minorSubsystemVersion(val: number) {
		this.view.setUint16(50, val, true);
	}
	public get win32VersionValue(): number {
		return this.view.getUint32(52, true);
	}
	public set win32VersionValue(val: number) {
		this.view.setUint32(52, val, true);
	}
	public get sizeOfImage(): number {
		return this.view.getUint32(56, true);
	}
	public set sizeOfImage(val: number) {
		this.view.setUint32(56, val, true);
	}
	public get sizeOfHeaders(): number {
		return this.view.getUint32(60, true);
	}
	public set sizeOfHeaders(val: number) {
		this.view.setUint32(60, val, true);
	}
	public get checkSum(): number {
		return this.view.getUint32(64, true);
	}
	public set checkSum(val: number) {
		this.view.setUint32(64, val, true);
	}
	public get subsystem(): number {
		return this.view.getUint16(68, true);
	}
	public set subsystem(val: number) {
		this.view.setUint16(68, val, true);
	}
	public get dllCharacteristics(): number {
		return this.view.getUint16(70, true);
	}
	public set dllCharacteristics(val: number) {
		this.view.setUint16(70, val, true);
	}
	public get sizeOfStackReserve(): number {
		return getUint64LE(this.view, 72);
	}
	public set sizeOfStackReserve(val: number) {
		setUint64LE(this.view, 72, val);
	}
	public get sizeOfStackReserveBigInt(): bigint {
		return getUint64LEBigInt(this.view, 72);
	}
	public set sizeOfStackReserveBigInt(val: bigint) {
		setUint64LEBigInt(this.view, 72, val);
	}
	public get sizeOfStackCommit(): number {
		return getUint64LE(this.view, 80);
	}
	public set sizeOfStackCommit(val: number) {
		setUint64LE(this.view, 80, val);
	}
	public get sizeOfStackCommitBigInt(): bigint {
		return getUint64LEBigInt(this.view, 80);
	}
	public set sizeOfStackCommitBigInt(val: bigint) {
		setUint64LEBigInt(this.view, 80, val);
	}
	public get sizeOfHeapReserve(): number {
		return getUint64LE(this.view, 88);
	}
	public set sizeOfHeapReserve(val: number) {
		setUint64LE(this.view, 88, val);
	}
	public get sizeOfHeapReserveBigInt(): bigint {
		return getUint64LEBigInt(this.view, 88);
	}
	public set sizeOfHeapReserveBigInt(val: bigint) {
		setUint64LEBigInt(this.view, 88, val);
	}
	public get sizeOfHeapCommit(): number {
		return getUint64LE(this.view, 96);
	}
	public set sizeOfHeapCommit(val: number) {
		setUint64LE(this.view, 96, val);
	}
	public get sizeOfHeapCommitBigInt(): bigint {
		return getUint64LEBigInt(this.view, 96);
	}
	public set sizeOfHeapCommitBigInt(val: bigint) {
		setUint64LEBigInt(this.view, 96, val);
	}
	public get loaderFlags(): number {
		return this.view.getUint32(104, true);
	}
	public set loaderFlags(val: number) {
		this.view.setUint32(104, val, true);
	}
	public get numberOfRvaAndSizes(): number {
		return this.view.getUint32(108, true);
	}
	public set numberOfRvaAndSizes(val: number) {
		this.view.setUint32(108, val, true);
	}
}

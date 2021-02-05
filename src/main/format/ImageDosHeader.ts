import FormatBase from './FormatBase';
import { createDataView } from '../util/functions';

export default class ImageDosHeader extends FormatBase {
	public static readonly size = 64;
	public static readonly DEFAULT_MAGIC = 0x5a4d; // 'MZ'

	private constructor(view: DataView) {
		super(view);
	}

	public static from(
		bin: ArrayBuffer | ArrayBufferView,
		offset = 0
	): ImageDosHeader {
		return new ImageDosHeader(createDataView(bin, offset, 64));
	}

	public isValid(): boolean {
		return this.magic === ImageDosHeader.DEFAULT_MAGIC;
	}

	public get magic(): number {
		return this.view.getUint16(0, true);
	}
	public set magic(val: number) {
		this.view.setUint16(0, val, true);
	}
	public get lastPageSize(): number {
		return this.view.getUint16(2, true);
	}
	public set lastPageSize(val: number) {
		this.view.setUint16(2, val, true);
	}
	public get pages(): number {
		return this.view.getUint16(4, true);
	}
	public set pages(val: number) {
		this.view.setUint16(4, val, true);
	}
	public get relocations(): number {
		return this.view.getUint16(6, true);
	}
	public set relocations(val: number) {
		this.view.setUint16(6, val, true);
	}
	public get headerSizeInParagraph(): number {
		return this.view.getUint16(8, true);
	}
	public set headerSizeInParagraph(val: number) {
		this.view.setUint16(8, val, true);
	}
	public get minAllocParagraphs(): number {
		return this.view.getUint16(10, true);
	}
	public set minAllocParagraphs(val: number) {
		this.view.setUint16(10, val, true);
	}
	public get maxAllocParagraphs(): number {
		return this.view.getUint16(12, true);
	}
	public set maxAllocParagraphs(val: number) {
		this.view.setUint16(12, val, true);
	}
	public get initialSS(): number {
		return this.view.getUint16(14, true);
	}
	public set initialSS(val: number) {
		this.view.setUint16(14, val, true);
	}
	public get initialSP(): number {
		return this.view.getUint16(16, true);
	}
	public set initialSP(val: number) {
		this.view.setUint16(16, val, true);
	}
	public get checkSum(): number {
		return this.view.getUint16(18, true);
	}
	public set checkSum(val: number) {
		this.view.setUint16(18, val, true);
	}
	public get initialIP(): number {
		return this.view.getUint16(20, true);
	}
	public set initialIP(val: number) {
		this.view.setUint16(20, val, true);
	}
	public get initialCS(): number {
		return this.view.getUint16(22, true);
	}
	public set initialCS(val: number) {
		this.view.setUint16(22, val, true);
	}
	public get relocationTableAddress(): number {
		return this.view.getUint16(24, true);
	}
	public set relocationTableAddress(val: number) {
		this.view.setUint16(24, val, true);
	}
	public get overlayNum(): number {
		return this.view.getUint16(26, true);
	}
	public set overlayNum(val: number) {
		this.view.setUint16(26, val, true);
	}
	// WORD e_res[4] (28,30,32,34)
	public get oemId(): number {
		return this.view.getUint16(36, true);
	}
	public set oemId(val: number) {
		this.view.setUint16(36, val, true);
	}
	public get oemInfo(): number {
		return this.view.getUint16(38, true);
	}
	public set oemInfo(val: number) {
		this.view.setUint16(38, val, true);
	}
	// WORD e_res2[10] (40,42,44,46,48,50,52,54,56,58)
	public get newHeaderAddress(): number {
		return this.view.getUint32(60, true);
	}
	public set newHeaderAddress(val: number) {
		this.view.setUint32(60, val, true);
	}
}

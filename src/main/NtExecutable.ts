
import ImageDataDirectoryArray from './format/ImageDataDirectoryArray';
import ImageDirectoryEntry from './format/ImageDirectoryEntry';
import ImageDosHeader from './format/ImageDosHeader';
import ImageNtHeaders from './format/ImageNtHeaders';
import ImageSectionHeaderArray, { ImageSectionHeader } from './format/ImageSectionHeaderArray';

import { calculateCheckSumForPE, cloneObject, copyBuffer, roundUp } from './util/functions';

export interface NtExecutableSection {
	info: ImageSectionHeader;
	data: ArrayBuffer | null;
}

export default class NtExecutable {

	private _dh: ImageDosHeader;
	private _nh: ImageNtHeaders;
	private _dda: ImageDataDirectoryArray;

	private constructor(
		private _headers: ArrayBuffer,
		private _sections: NtExecutableSection[]
	) {
		const dh = ImageDosHeader.from(_headers);
		const nh = ImageNtHeaders.from(_headers, dh.newHeaderAddress);
		this._dh = dh;
		this._nh = nh;
		this._dda = nh.optionalHeaderDataDirectory;

		_sections.sort((a, b) => {
			const ra = a.info.pointerToRawData;
			const rb = a.info.pointerToRawData;
			if (ra !== rb) {
				return ra - rb;
			}
			const va = a.info.virtualAddress;
			const vb = b.info.virtualAddress;
			if (va === vb) {
				return a.info.virtualSize - b.info.virtualSize;
			}
			return va - vb;
		});
	}

	/**
	 * Parse the binary and create NtExecutable instance.
	 * An error will be thrown if the binary data is invalid
	 * @param bin binary data
	 * @return NtExecutable instance
	 */
	public static from(bin: ArrayBuffer): NtExecutable {
		const dh = ImageDosHeader.from(bin);
		const nh = ImageNtHeaders.from(bin, dh.newHeaderAddress);
		if (!dh.isValid() || !nh.isValid()) {
			throw new TypeError('Invalid binary format');
		}
		if (nh.fileHeader.numberOfSymbols > 0) {
			throw new Error('Binary with symbols is not supported now');
		}
		const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
		const secCount = nh.fileHeader.numberOfSections;
		const sections: {
			info: ImageSectionHeader
			data: ArrayBuffer | null
		}[] = [];
		const secArray = ImageSectionHeaderArray.from(bin, secCount, secOff);
		// console.log(`from data size 0x${bin.byteLength.toString(16)}:`);
		secArray.forEach((info) => {
			if (!info.pointerToRawData || !info.sizeOfRawData) {
				info.pointerToRawData = 0;
				info.sizeOfRawData = 0;
				sections.push({
					info,
					data: null
				});
			} else {
				const secBin = new ArrayBuffer(info.sizeOfRawData);
				// console.log(`  section ${info.name}: 0x${info.pointerToRawData.toString(16)}, size = 0x${info.sizeOfRawData.toString(16)}`);
				copyBuffer(secBin, 0, bin, info.pointerToRawData, info.sizeOfRawData);
				sections.push({
					info,
					data: secBin
				});
			}
		});
		// the size of DOS and NT headers is equal to section offset
		const headers = new ArrayBuffer(secOff);
		copyBuffer(headers, 0, bin, 0, secOff);
		return new NtExecutable(headers, sections);
	}

	/**
	 * Returns whether the executable is for 32-bit architecture
	 */
	public is32bit() {
		return this._nh.is32bit();
	}

	public getTotalHeaderSize() {
		return this._headers.byteLength;
	}

	public getImageBase() {
		return this._nh.optionalHeader.imageBase;
	}

	public getFileAlignment() {
		return this._nh.optionalHeader.fileAlignment;
	}

	public getSectionAlignment() {
		return this._nh.optionalHeader.sectionAlignment;
	}

	/**
	 * Return all sections. The returned array is sorted by raw address.
	 */
	public getAllSections(): ReadonlyArray<NtExecutableSection> {
		return this._sections;
	}

	/**
	 * Return the section data from ImageDirectoryEntry enum value.
	 */
	public getSectionByEntry(entry: ImageDirectoryEntry): Readonly<NtExecutableSection> | null {
		const dd = this._dda.get(entry);
		if (!dd) {
			return null;
		}
		const r = this._sections.filter((sec) => {
			const vaEnd = sec.info.virtualAddress + sec.info.virtualSize;
			return (dd.virtualAddress >= sec.info.virtualAddress && dd.virtualAddress < vaEnd);
		})[0];
		return r || null;
	}

	/**
	 * Set the section data from ImageDirectoryEntry enum value.
	 * If entry is found, then replaces the secion data. If not found, then adds the section data.
	 *
	 * NOTE: 'virtualAddress' and 'pointerToRawData' of section object is ignored
	 * and calculated automatically. 'virtualSize' and 'sizeOfRawData' are used, but
	 * if the 'section.data.byteLength' is larger than 'sizeOfRawData', then
	 * these members are replaced.
	 *
	 * @param entry ImageDirectoryEntry enum value for the section
	 * @param section the section data, or null to remove the section
	 */
	public setSectionByEntry(entry: ImageDirectoryEntry, section: Readonly<NtExecutableSection> | null) {
		const sec: NtExecutableSection | null = section ? {
			data: section.data,
			info: section.info
		} : null;
		const dd = this._dda.get(entry);
		const hasEntry = !!(dd && dd.size);

		if (!sec) {
			if (!hasEntry) {
				// no need to replace
			} else {
				// clear entry
				this._dda.set(entry, { size: 0, virtualAddress: 0 });
				const len = this._sections.length;
				for (let i = 0; i < len; ++i) {
					const sec = this._sections[i];
					const vaStart = sec.info.virtualAddress;
					const vaLast = vaStart + sec.info.virtualSize;
					if (dd.virtualAddress >= vaStart && dd.virtualAddress < vaLast) {
						this._sections.splice(i, 1);
						// section count changed
						this._nh.fileHeader.numberOfSections = this._sections.length;
						break;
					}
				}
			}
		} else {
			const rawSize = !sec.data ? 0 : sec.data.byteLength;
			const secAlign = this._nh.optionalHeader.sectionAlignment;
			let alignedFileSize = !sec.data ? 0 : roundUp(rawSize, this._nh.optionalHeader.fileAlignment);
			const alignedSecSize = !sec.data ? 0 : roundUp(sec.info.virtualSize, secAlign);
			if (sec.info.sizeOfRawData < alignedFileSize) {
				sec.info.sizeOfRawData = alignedFileSize;
			} else {
				alignedFileSize = sec.info.sizeOfRawData;
			}

			if (!hasEntry) {
				let virtAddr = 0;
				let rawAddr = this._headers.byteLength;
				// get largest addresses
				this._sections.forEach((secExist) => {
					if (secExist.info.pointerToRawData) {
						if (rawAddr <= secExist.info.pointerToRawData) {
							rawAddr = secExist.info.pointerToRawData + secExist.info.sizeOfRawData;
						}
					}
					if (virtAddr <= secExist.info.virtualAddress) {
						virtAddr = secExist.info.virtualAddress + secExist.info.virtualSize;
					}
				});
				if (!alignedFileSize) {
					rawAddr = 0;
				}
				virtAddr = roundUp(virtAddr, secAlign);
				sec.info.pointerToRawData = rawAddr;
				sec.info.virtualAddress = virtAddr;
				// add entry
				this._dda.set(entry, { size: rawSize, virtualAddress: virtAddr });
				this._sections.push(sec);

				// section count changed
				this._nh.fileHeader.numberOfSections = this._sections.length;

				// change image size
				this._nh.optionalHeader.sizeOfImage = roundUp(virtAddr + alignedSecSize, this._nh.optionalHeader.sectionAlignment);
			} else {
				// replace entry
				this.replaceSectionImpl(dd.virtualAddress, sec.info, sec.data);
			}
		}
	}

	/**
	 * Generates the executable binary data.
	 */
	public generate(): ArrayBuffer {
		// calculate binary size
		const dh = this._dh;
		const nh = this._nh;
		const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
		let size = secOff;
		size += this._sections.length * 40;
		const align = nh.optionalHeader.fileAlignment;
		size = Math.floor((size + align - 1) / align) * align;

		this._sections.forEach((sec) => {
			if (!sec.info.pointerToRawData) {
				return;
			}
			const lastOff = sec.info.pointerToRawData + sec.info.sizeOfRawData;
			if (size < lastOff) {
				size = lastOff;
				size = Math.floor((size + align - 1) / align) * align;
			}
		});

		// make buffer
		const bin = new ArrayBuffer(size);
		const u8bin = new Uint8Array(bin);
		u8bin.set(new Uint8Array(this._headers, 0, secOff));
		const secArray = ImageSectionHeaderArray.from(bin, this._sections.length * 40, secOff);
		this._sections.forEach((sec, i) => {
			if (!sec.data) {
				sec.info.pointerToRawData = 0;
				sec.info.sizeOfRawData = 0;
			}
			secArray.set(i, sec.info);
			if (!sec.data || !sec.info.pointerToRawData) {
				return;
			}
			u8bin.set(new Uint8Array(sec.data), sec.info.pointerToRawData);
		});

		// re-calc checksum
		if (nh.optionalHeader.checkSum !== 0) {
			calculateCheckSumForPE(bin, true);
		}

		return bin;
	}

	private rearrangeSections(rawAddressStart: number, rawDiff: number, virtualAddressStart: number, virtualDiff: number) {
		if (!rawDiff && !virtualDiff) {
			return;
		}
		const nh = this._nh;
		const secAlign = nh.optionalHeader.sectionAlignment;
		const dirs = this._dda;
		const len = this._sections.length;
		let lastVirtAddress = 0;
		for (let i = 0; i < len; ++i) {
			const sec = this._sections[i];
			let virtAddr = sec.info.virtualAddress;
			if (virtualDiff && virtAddr >= virtualAddressStart) {
				const iDir = dirs.findIndexByVirtualAddress(virtAddr);
				virtAddr += virtualDiff;
				if (iDir !== null) {
					dirs.set(iDir, { virtualAddress: virtAddr, size: sec.info.virtualSize });
				}
				sec.info.virtualAddress = virtAddr;
			}
			const fileAddr = sec.info.pointerToRawData;
			if (rawDiff && fileAddr >= rawAddressStart) {
				sec.info.pointerToRawData = fileAddr + rawDiff;
			}
			lastVirtAddress = roundUp(sec.info.virtualAddress + sec.info.virtualSize, secAlign);
		}

		// fix image size from last virtual address
		nh.optionalHeader.sizeOfImage = lastVirtAddress;
	}

	// NOTE: info.virtualSize must be valid
	private replaceSectionImpl(virtualAddress: number, info: Readonly<ImageSectionHeader>, data: ArrayBuffer | null) {
		const len = this._sections.length;
		for (let i = 0; i < len; ++i) {
			const s = this._sections[i];
			// console.log(`replaceSectionImpl: ${virtualAddress} <--> ${s.info.virtualAddress}`);
			if (s.info.virtualAddress === virtualAddress) {
				// console.log(`  found`);
				const secAlign = this._nh.optionalHeader.sectionAlignment;
				const fileAddr = s.info.pointerToRawData;
				const oldFileAddr = fileAddr + s.info.sizeOfRawData;
				const oldVirtAddr = virtualAddress + roundUp(s.info.virtualSize, secAlign);
				s.info = cloneObject(info);
				s.info.virtualAddress = virtualAddress;
				s.info.pointerToRawData = fileAddr;
				s.data = data;

				// shift addresses
				const newFileAddr = fileAddr + info.sizeOfRawData;
				const newVirtAddr = virtualAddress + roundUp(info.virtualSize, secAlign);
				this.rearrangeSections(oldFileAddr, newFileAddr - oldFileAddr, oldVirtAddr, newVirtAddr - oldVirtAddr);

				// BLOCK: rewrite DataDirectory entry for specified virtualAddress
				{
					const dirs = this._dda;
					const iDir = dirs.findIndexByVirtualAddress(virtualAddress);
					if (iDir !== null) {
						dirs.set(iDir, { virtualAddress, size: info.virtualSize });
					}
				}
				break;
			}
		}
	}
}

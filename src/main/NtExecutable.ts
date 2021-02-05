import ImageDataDirectoryArray from './format/ImageDataDirectoryArray';
import ImageDirectoryEntry from './format/ImageDirectoryEntry';
import ImageDosHeader from './format/ImageDosHeader';
import ImageNtHeaders from './format/ImageNtHeaders';
import ImageSectionHeaderArray, {
	ImageSectionHeader,
} from './format/ImageSectionHeaderArray';

import {
	allocatePartialBinary,
	calculateCheckSumForPE,
	cloneObject,
	cloneToArrayBuffer,
	roundUp,
} from './util/functions';

export interface NtExecutableFromOptions {
	/** true to parse binary even if the binary contains Certificate data (i.e. 'signed') */
	ignoreCert?: boolean;
}

export interface NtExecutableSection {
	info: ImageSectionHeader;
	data: ArrayBuffer | null;
}

export default class NtExecutable {
	private readonly _dh: ImageDosHeader;
	private readonly _nh: ImageNtHeaders;
	private readonly _dda: ImageDataDirectoryArray;

	private constructor(
		private readonly _headers: ArrayBuffer,
		private readonly _sections: NtExecutableSection[],
		private _ex: ArrayBuffer | null
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
	 * @param options additional option for parsing
	 * @return NtExecutable instance
	 */
	public static from(
		bin: ArrayBuffer | ArrayBufferView,
		options?: NtExecutableFromOptions
	): NtExecutable {
		const dh = ImageDosHeader.from(bin);
		const nh = ImageNtHeaders.from(bin, dh.newHeaderAddress);
		if (!dh.isValid() || !nh.isValid()) {
			throw new TypeError('Invalid binary format');
		}
		if (nh.fileHeader.numberOfSymbols > 0) {
			throw new Error('Binary with symbols is not supported now');
		}
		const fileAlignment = nh.optionalHeader.fileAlignment;
		const securityEntry = nh.optionalHeaderDataDirectory.get(
			ImageDirectoryEntry.Certificate
		);
		if (securityEntry.size > 0) {
			// Signed executables should be parsed only when `ignoreCert` is true
			if (!options || !options.ignoreCert) {
				throw new Error(
					'Parsing signed executable binary is not allowed by default.'
				);
			}
		}
		const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
		const secCount = nh.fileHeader.numberOfSections;
		const sections: NtExecutableSection[] = [];
		const tempSectionHeaderBinary = allocatePartialBinary(
			bin,
			secOff,
			secCount * ImageSectionHeaderArray.itemSize
		);
		const secArray = ImageSectionHeaderArray.from(
			tempSectionHeaderBinary,
			secCount,
			0
		);
		let lastOffset = roundUp(
			secOff + secCount * ImageSectionHeaderArray.itemSize,
			fileAlignment
		);
		// console.log(`from data size 0x${bin.byteLength.toString(16)}:`);
		secArray.forEach((info) => {
			if (!info.pointerToRawData || !info.sizeOfRawData) {
				info.pointerToRawData = 0;
				info.sizeOfRawData = 0;
				sections.push({
					info,
					data: null,
				});
			} else {
				// console.log(`  section ${info.name}: 0x${info.pointerToRawData.toString(16)}, size = 0x${info.sizeOfRawData.toString(16)}`);
				const secBin = allocatePartialBinary(
					bin,
					info.pointerToRawData,
					info.sizeOfRawData
				);
				sections.push({
					info,
					data: secBin,
				});
				const secEndOffset = roundUp(
					info.pointerToRawData + info.sizeOfRawData,
					fileAlignment
				);
				if (secEndOffset > lastOffset) {
					lastOffset = secEndOffset;
				}
			}
		});
		// the size of DOS and NT headers is equal to section offset
		const headers = allocatePartialBinary(bin, 0, secOff);

		// extra data
		let exData: ArrayBuffer | null = null;
		let lastExDataOffset = bin.byteLength;
		// It may contain that both extra data and certificate data are available.
		// In this case the extra data is followed by the certificate data.
		if (securityEntry.size > 0) {
			lastExDataOffset = securityEntry.virtualAddress;
		}
		if (lastOffset < lastExDataOffset) {
			exData = allocatePartialBinary(
				bin,
				lastOffset,
				lastExDataOffset - lastOffset
			);
		}

		return new NtExecutable(headers, sections, exData);
	}

	/**
	 * Returns whether the executable is for 32-bit architecture
	 */
	public is32bit(): boolean {
		return this._nh.is32bit();
	}

	public getTotalHeaderSize(): number {
		return this._headers.byteLength;
	}

	public get dosHeader(): ImageDosHeader {
		return this._dh;
	}

	public get newHeader(): ImageNtHeaders {
		return this._nh;
	}

	// @internal
	public getRawHeader(): ArrayBuffer {
		return this._headers;
	}

	public getImageBase(): number {
		return this._nh.optionalHeader.imageBase;
	}

	public getFileAlignment(): number {
		return this._nh.optionalHeader.fileAlignment;
	}

	public getSectionAlignment(): number {
		return this._nh.optionalHeader.sectionAlignment;
	}

	/**
	 * Return all sections. The returned array is sorted by raw address.
	 */
	public getAllSections(): readonly NtExecutableSection[] {
		return this._sections;
	}

	/**
	 * Return the section data from ImageDirectoryEntry enum value.
	 */
	public getSectionByEntry(
		entry: ImageDirectoryEntry
	): Readonly<NtExecutableSection> | null {
		const dd = this._dda.get(entry);
		const r = this._sections
			.filter((sec) => {
				const vaEnd = sec.info.virtualAddress + sec.info.virtualSize;
				return (
					dd.virtualAddress >= sec.info.virtualAddress &&
					dd.virtualAddress < vaEnd
				);
			})
			.shift();
		return r !== undefined ? r : null;
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
	public setSectionByEntry(
		entry: ImageDirectoryEntry,
		section: Readonly<NtExecutableSection> | null
	): void {
		const sec: NtExecutableSection | null = section
			? { data: section.data, info: section.info }
			: null;
		const dd = this._dda.get(entry);
		const hasEntry = dd.size > 0;

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
					if (
						dd.virtualAddress >= vaStart &&
						dd.virtualAddress < vaLast
					) {
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
			let alignedFileSize = !sec.data
				? 0
				: roundUp(rawSize, this._nh.optionalHeader.fileAlignment);
			const alignedSecSize = !sec.data
				? 0
				: roundUp(sec.info.virtualSize, secAlign);
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
							rawAddr =
								secExist.info.pointerToRawData +
								secExist.info.sizeOfRawData;
						}
					}
					if (virtAddr <= secExist.info.virtualAddress) {
						virtAddr =
							secExist.info.virtualAddress +
							secExist.info.virtualSize;
					}
				});
				if (!alignedFileSize) {
					rawAddr = 0;
				}
				virtAddr = roundUp(virtAddr, secAlign);
				sec.info.pointerToRawData = rawAddr;
				sec.info.virtualAddress = virtAddr;
				// add entry
				this._dda.set(entry, {
					size: rawSize,
					virtualAddress: virtAddr,
				});
				this._sections.push(sec);

				// section count changed
				this._nh.fileHeader.numberOfSections = this._sections.length;

				// change image size
				this._nh.optionalHeader.sizeOfImage = roundUp(
					virtAddr + alignedSecSize,
					this._nh.optionalHeader.sectionAlignment
				);
			} else {
				// replace entry
				this.replaceSectionImpl(dd.virtualAddress, sec.info, sec.data);
			}
		}
	}

	/**
	 * Returns the extra data in the executable, or `null` if nothing.
	 * You can rewrite the returned buffer without using `setExtraData` if
	 * the size of the new data is equal to the old data.
	 */
	public getExtraData(): ArrayBuffer | null {
		return this._ex;
	}

	/**
	 * Specifies the new extra data in the executable.
	 * The specified buffer will be cloned and you can release it after calling this method.
	 * @param bin buffer containing the new data
	 * @note
	 * The extra data will not be aligned by `NtExecutable`.
	 */
	public setExtraData(bin: ArrayBuffer | ArrayBufferView | null): void {
		if (bin === null) {
			this._ex = null;
		} else {
			this._ex = cloneToArrayBuffer(bin);
		}
	}

	/**
	 * Generates the executable binary data.
	 */
	public generate(paddingSize?: number): ArrayBuffer {
		// calculate binary size
		const dh = this._dh;
		const nh = this._nh;
		const secOff = dh.newHeaderAddress + nh.getSectionHeaderOffset();
		let size = secOff;
		size += this._sections.length * ImageSectionHeaderArray.itemSize;
		const align = nh.optionalHeader.fileAlignment;
		size = roundUp(size, align);

		this._sections.forEach((sec) => {
			if (!sec.info.pointerToRawData) {
				return;
			}
			const lastOff = sec.info.pointerToRawData + sec.info.sizeOfRawData;
			if (size < lastOff) {
				size = lastOff;
				size = roundUp(size, align);
			}
		});

		const lastPosition = size;
		if (this._ex !== null) {
			size += this._ex.byteLength;
		}

		if (typeof paddingSize === 'number') {
			size += paddingSize;
		}

		// make buffer
		const bin = new ArrayBuffer(size);
		const u8bin = new Uint8Array(bin);
		u8bin.set(new Uint8Array(this._headers, 0, secOff));

		// reset Security section offset (eliminate it)
		ImageDataDirectoryArray.from(
			bin,
			dh.newHeaderAddress + nh.getDataDirectoryOffset()
		).set(ImageDirectoryEntry.Certificate, {
			size: 0,
			virtualAddress: 0,
		});

		const secArray = ImageSectionHeaderArray.from(
			bin,
			this._sections.length,
			secOff
		);
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

		if (this._ex !== null) {
			u8bin.set(new Uint8Array(this._ex), lastPosition);
		}

		// re-calc checksum
		if (nh.optionalHeader.checkSum !== 0) {
			calculateCheckSumForPE(bin, true);
		}

		return bin;
	}

	private rearrangeSections(
		rawAddressStart: number,
		rawDiff: number,
		virtualAddressStart: number,
		virtualDiff: number
	) {
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
					dirs.set(iDir, {
						virtualAddress: virtAddr,
						size: sec.info.virtualSize,
					});
				}
				sec.info.virtualAddress = virtAddr;
			}
			const fileAddr = sec.info.pointerToRawData;
			if (rawDiff && fileAddr >= rawAddressStart) {
				sec.info.pointerToRawData = fileAddr + rawDiff;
			}
			lastVirtAddress = roundUp(
				sec.info.virtualAddress + sec.info.virtualSize,
				secAlign
			);
		}

		// fix image size from last virtual address
		nh.optionalHeader.sizeOfImage = lastVirtAddress;
	}

	// NOTE: info.virtualSize must be valid
	private replaceSectionImpl(
		virtualAddress: number,
		info: Readonly<ImageSectionHeader>,
		data: ArrayBuffer | null
	) {
		const len = this._sections.length;
		for (let i = 0; i < len; ++i) {
			const s = this._sections[i];
			// console.log(`replaceSectionImpl: ${virtualAddress} <--> ${s.info.virtualAddress}`);
			if (s.info.virtualAddress === virtualAddress) {
				// console.log(`  found`);
				const secAlign = this._nh.optionalHeader.sectionAlignment;
				const fileAddr = s.info.pointerToRawData;
				const oldFileAddr = fileAddr + s.info.sizeOfRawData;
				const oldVirtAddr =
					virtualAddress + roundUp(s.info.virtualSize, secAlign);
				s.info = cloneObject(info);
				s.info.virtualAddress = virtualAddress;
				s.info.pointerToRawData = fileAddr;
				s.data = data;

				// shift addresses
				const newFileAddr = fileAddr + info.sizeOfRawData;
				const newVirtAddr =
					virtualAddress + roundUp(info.virtualSize, secAlign);
				this.rearrangeSections(
					oldFileAddr,
					newFileAddr - oldFileAddr,
					oldVirtAddr,
					newVirtAddr - oldVirtAddr
				);

				// BLOCK: rewrite DataDirectory entry for specified virtualAddress
				{
					const dirs = this._dda;
					const iDir = dirs.findIndexByVirtualAddress(virtualAddress);
					if (iDir !== null) {
						dirs.set(iDir, {
							virtualAddress,
							size: info.virtualSize,
						});
					}
				}
				break;
			}
		}
	}
}

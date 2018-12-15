
import ArrayFormatBase from './ArrayFormatBase';
import FormatBase from './FormatBase';
import ImageDataDirectoryArray from './ImageDataDirectoryArray';
import ImageDirectoryEntry from './ImageDirectoryEntry';
import ImageDosHeader from './ImageDosHeader';
import ImageFileHeader from './ImageFileHeader';
import ImageNtHeaders from './ImageNtHeaders';
import ImageOptionalHeader from './ImageOptionalHeader';
import ImageOptionalHeader64 from './ImageOptionalHeader64';
import ImageSectionHeaderArray from './ImageSectionHeaderArray';

export {
	ArrayFormatBase,
	FormatBase,
	ImageDataDirectoryArray,
	ImageDirectoryEntry,
	ImageDosHeader,
	ImageFileHeader,
	ImageNtHeaders,
	ImageOptionalHeader,
	ImageOptionalHeader64,
	ImageSectionHeaderArray
};

export function getImageDosHeader(bin: ArrayBuffer) {
	return ImageDosHeader.from(bin);
}
export function getImageNtHeadersByDosHeader(bin: ArrayBuffer, dosHeader: ImageDosHeader) {
	return ImageNtHeaders.from(bin, dosHeader.newHeaderAddress);
}
export function getImageSectionHeadersByNtHeaders(bin: ArrayBuffer, dosHeader: ImageDosHeader, ntHeaders: ImageNtHeaders) {
	return ImageSectionHeaderArray.from(bin, ntHeaders.fileHeader.numberOfSections, dosHeader.newHeaderAddress + ntHeaders.byteLength);
}
export function findImageSectionBlockByDirectoryEntry(
	bin: ArrayBuffer,
	dosHeader: ImageDosHeader,
	ntHeaders: ImageNtHeaders,
	entryType: ImageDirectoryEntry
) {
	const arr = ImageSectionHeaderArray.from(bin, ntHeaders.fileHeader.numberOfSections, dosHeader.newHeaderAddress + ntHeaders.byteLength);
	const len = arr.length;
	const rva = ntHeaders.optionalHeaderDataDirectory.get(entryType).virtualAddress;
	for (let i = 0; i < len; ++i) {
		const sec = arr.get(i);
		const vaEnd = sec.virtualAddress + sec.virtualSize;
		if (rva >= sec.virtualAddress && rva < vaEnd) {
			const ptr = sec.pointerToRawData;
			if (!ptr) {
				return null;
			}
			return bin.slice(ptr, ptr + sec.sizeOfRawData);
		}
		if (rva < sec.virtualAddress) {
			return null;
		}
	}
	return null;
}

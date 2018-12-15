/// <reference types='jest' />

import { loadIcon } from '../util/fs';

import IconFile, { IconFileItem } from '@/data/IconFile';

function getIconWidth(icon: IconFileItem) {
	return icon.width || (icon.data.isIcon() ? icon.data.bitmapInfo.width : icon.data.width);
}

function getIconHeight(icon: IconFileItem) {
	return icon.height || (icon.data.isIcon() ? icon.data.bitmapInfo.height : icon.data.height);
}

describe('IconFile', () => {
	it('should be parsed correctly 1', () => {
		const bin = loadIcon('data1_4b16_4b32');
		const icon = IconFile.from(bin);

		expect(icon.icons.length).toEqual(2);

		const iconsSorted = icon.icons.sort((a, b) => (getIconWidth(a) - getIconWidth(b)));
		expect(iconsSorted[0].width).toEqual(16);
		expect(iconsSorted[0].height).toEqual(16);
		expect(iconsSorted[0].bitCount).toEqual(4);
		expect(iconsSorted[0].data.isIcon()).toBeTruthy();
		expect(iconsSorted[0].data.isIcon() && iconsSorted[0].data.pixels.byteLength).toBeGreaterThan(0);
		expect(iconsSorted[0].data.isIcon() && iconsSorted[0].data.masks).toBeTruthy();
		expect(iconsSorted[1].width).toEqual(32);
		expect(iconsSorted[1].height).toEqual(32);
		expect(iconsSorted[1].bitCount).toEqual(4);
		expect(iconsSorted[1].data.isIcon()).toBeTruthy();
		expect(iconsSorted[1].data.isIcon() && iconsSorted[1].data.pixels.byteLength).toBeGreaterThan(0);
		expect(iconsSorted[1].data.isIcon() && iconsSorted[1].data.masks).toBeTruthy();
	});
	it('should be parsed correctly 2', () => {
		const bin = loadIcon('data1_4b16_4b32_4b64_png256');
		const icon = IconFile.from(bin);

		expect(icon.icons.length).toEqual(4);

		const iconsSorted = icon.icons.sort((a, b) => (getIconWidth(a) - getIconWidth(b)));
		expect(iconsSorted[0].width).toEqual(16);
		expect(iconsSorted[0].height).toEqual(16);
		expect(iconsSorted[0].bitCount).toEqual(4);
		expect(iconsSorted[0].data.isIcon()).toBeTruthy();
		expect(iconsSorted[0].data.isIcon() && iconsSorted[0].data.pixels.byteLength).toBeGreaterThan(0);
		expect(iconsSorted[0].data.isIcon() && iconsSorted[0].data.masks).toBeTruthy();
		expect(iconsSorted[1].width).toEqual(32);
		expect(iconsSorted[1].height).toEqual(32);
		expect(iconsSorted[1].bitCount).toEqual(4);
		expect(iconsSorted[1].data.isIcon()).toBeTruthy();
		expect(iconsSorted[1].data.isIcon() && iconsSorted[1].data.pixels.byteLength).toBeGreaterThan(0);
		expect(iconsSorted[1].data.isIcon() && iconsSorted[1].data.masks).toBeTruthy();
		expect(iconsSorted[2].width).toEqual(64);
		expect(iconsSorted[2].height).toEqual(64);
		expect(iconsSorted[2].bitCount).toEqual(4);
		expect(iconsSorted[2].data.isIcon()).toBeTruthy();
		expect(iconsSorted[2].data.isIcon() && iconsSorted[2].data.pixels.byteLength).toBeGreaterThan(0);
		expect(iconsSorted[2].data.isIcon() && iconsSorted[2].data.masks).toBeTruthy();
		expect(getIconWidth(iconsSorted[3])).toEqual(256);
		expect(getIconHeight(iconsSorted[3])).toEqual(256);
		expect(iconsSorted[3].data.isRaw()).toBeTruthy();
		expect(iconsSorted[3].data.isRaw() && iconsSorted[3].data.bin.byteLength).toBeGreaterThan(0);
	});
});

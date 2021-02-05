import { loadIcon } from '../util/fs';

import IconFile, { IconFileItem } from '@/data/IconFile';

function getIconWidth(icon: IconFileItem) {
	return (
		icon.width ??
		(icon.data.isIcon() ? icon.data.bitmapInfo.width : icon.data.width)
	);
}

function getIconHeight(icon: IconFileItem) {
	return (
		icon.height ??
		(icon.data.isIcon() ? icon.data.bitmapInfo.height : icon.data.height)
	);
}

describe('IconFile', () => {
	it('should be parsed correctly 1', () => {
		const bin = loadIcon('data1_4b16_4b32');
		const icon = IconFile.from(bin);

		expect(icon.icons.length).toEqual(2);

		const iconsSorted = icon.icons.sort(
			(a, b) => getIconWidth(a) - getIconWidth(b)
		);
		[
			[16, 16],
			[32, 32],
		].forEach(([width, height], i) => {
			const icon = iconsSorted[i];
			expect(icon.width).toEqual(width);
			expect(icon.height).toEqual(height);
			expect(icon.bitCount).toEqual(4);
			expect(icon.data.isIcon()).toBeTruthy();
			expect(
				icon.data.isIcon() && icon.data.pixels.byteLength
			).toBeGreaterThan(0);
			expect(icon.data.isIcon() && icon.data.masks).toBeTruthy();
			expect(icon.data.isIcon() && icon.data.width).toEqual(width);
			expect(icon.data.isIcon() && icon.data.height).toEqual(height);
		});
	});
	it('should be parsed correctly 2', () => {
		const bin = loadIcon('data1_4b16_4b32_4b64_png256');
		const icon = IconFile.from(bin);

		expect(icon.icons.length).toEqual(4);

		const iconsSorted = icon.icons.sort(
			(a, b) => getIconWidth(a) - getIconWidth(b)
		);
		[
			[16, 16],
			[32, 32],
			[64, 64],
		].forEach(([width, height], i) => {
			const icon = iconsSorted[i];
			expect(icon.width).toEqual(width);
			expect(icon.height).toEqual(height);
			expect(icon.bitCount).toEqual(4);
			expect(icon.data.isIcon()).toBeTruthy();
			expect(
				icon.data.isIcon() && icon.data.pixels.byteLength
			).toBeGreaterThan(0);
			expect(icon.data.isIcon() && icon.data.masks).toBeTruthy();
			expect(icon.data.isIcon() && icon.data.width).toEqual(width);
			expect(icon.data.isIcon() && icon.data.height).toEqual(height);
		});
		expect(getIconWidth(iconsSorted[3])).toEqual(256);
		expect(getIconHeight(iconsSorted[3])).toEqual(256);
		expect(iconsSorted[3].data.isRaw()).toBeTruthy();
		expect(
			iconsSorted[3].data.isRaw() && iconsSorted[3].data.bin.byteLength
		).toBeGreaterThan(0);
		expect(
			iconsSorted[3].data.isRaw() && iconsSorted[3].data.width
		).toEqual(256);
		expect(
			iconsSorted[3].data.isRaw() && iconsSorted[3].data.height
		).toEqual(256);
	});
});

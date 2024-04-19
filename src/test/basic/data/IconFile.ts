import { loadIcon } from '../../util/fs.js';

import IconFile, { IconFileItem } from '@/data/IconFile.js';

function getIconWidth(icon: IconFileItem) {
	return icon.width !== undefined && icon.width !== 0
		? icon.width
		: icon.data.isIcon()
		? icon.data.bitmapInfo.width
		: icon.data.width;
}

function getIconHeight(icon: IconFileItem) {
	return icon.height !== undefined && icon.height !== 0
		? icon.height
		: icon.data.isIcon()
		? icon.data.bitmapInfo.height
		: icon.data.height;
}

describe('IconFile', () => {
	it('should be instantiated with empty icons', () => {
		const icon = new IconFile();
		expect(icon.icons).toEqual([]);
	});
	it.each([
		['data1_4b16_4b32', 4],
		['data1_8b16_8b32', 8],
	] as const)(
		'should be parsed and generated correctly 1 (for %s)',
		(iconName, bitCount) => {
			const bin = loadIcon(iconName);
			const icon = IconFile.from(bin);

			expect(icon.icons.length).toEqual(2);

			const iconsSorted = icon.icons.sort(
				(a, b) => getIconWidth(a) - getIconWidth(b)
			);
			[
				[16, 16],
				[32, 32],
			].forEach(([width, height], i) => {
				const icon = iconsSorted[i]!;
				expect(icon.width).toEqual(width);
				expect(icon.height).toEqual(height);
				expect(icon.bitCount).toEqual(bitCount);
				expect(icon.data.isIcon()).toBeTruthy();
				expect(
					icon.data.isIcon() && icon.data.pixels.byteLength
				).toBeGreaterThan(0);
				expect(icon.data.isIcon() && icon.data.masks).toBeTruthy();
				expect(icon.data.isIcon() && icon.data.width).toEqual(width);
				expect(icon.data.isIcon() && icon.data.height).toEqual(height);
			});

			const newBin = Buffer.from(icon.generate());
			expect(newBin).toEqual(bin);
		}
	);
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
			const icon = iconsSorted[i]!;
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
		const thirdIcon = iconsSorted[3]!;
		expect(getIconWidth(thirdIcon)).toEqual(256);
		expect(getIconHeight(thirdIcon)).toEqual(256);
		expect(thirdIcon.data.isRaw()).toBeTruthy();
		expect(
			thirdIcon.data.isRaw() && thirdIcon.data.bin.byteLength
		).toBeGreaterThan(0);
		expect(thirdIcon.data.isRaw() && thirdIcon.data.width).toEqual(256);
		expect(thirdIcon.data.isRaw() && thirdIcon.data.height).toEqual(256);

		const newBin = Buffer.from(icon.generate());
		expect(newBin).toEqual(bin);
	});
	describe.each([
		'data1_4b16_4b32',
		'data1_8b16_8b32',
		'data1_4b16_4b32_4b64_png256',
	])('for icon %s', (iconName) => {
		it.each(['width', 'height', 'colors', 'bitCount'] as const)(
			'should satisfy that IconFileItem.%s is optional',
			(field) => {
				const bin = loadIcon(iconName);
				const icon = IconFile.from(bin);
				for (const i of icon.icons) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete i[field];
				}
				const newBin = Buffer.from(icon.generate());
				expect(newBin).toEqual(bin);
			}
		);
		it('should satisfy that IconFileItem.planes is optional (and use bi.biPlanes)', () => {
			const bin = loadIcon(iconName);
			const icon = IconFile.from(bin);
			for (const i of icon.icons) {
				delete i.planes;
			}
			const newBin = Buffer.from(icon.generate());

			for (const i of icon.icons) {
				if (i.data.isIcon()) {
					i.planes = i.data.bitmapInfo.planes;
				} else {
					i.planes = 1;
				}
			}
			const expectedBin = Buffer.from(icon.generate());

			expect(newBin).toEqual(expectedBin);
		});
	});
});

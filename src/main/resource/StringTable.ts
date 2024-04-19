import { NtExecutableResource, Type } from 'pe-library';

import StringTableItem from './StringTableItem.js';

/** Utility class to create / parse String Table resource */
export default class StringTable {
	/** Language value */
	public lang: string | number;
	private items: StringTableItem[];

	constructor() {
		this.lang = 0;
		this.items = [];
	}

	/** Create StringTable instance from resource entries, with specified language. */
	public static fromEntries(
		lang: string | number,
		entries: readonly Type.ResourceEntry[]
	): StringTable {
		const r = new StringTable();
		entries.forEach((e) => {
			// 6: RT_STRING
			if (
				e.type !== 6 ||
				e.lang !== lang ||
				typeof e.id !== 'number' ||
				e.id <= 0
			) {
				return;
			}
			r.items[e.id - 1] = StringTableItem.fromEntry(
				e.bin,
				0,
				e.bin.byteLength
			);
		});
		r.lang = lang;
		return r;
	}

	/** Return all string entries. */
	public getAllStrings(): Array<{ id: number; text: string }> {
		return this.items
			.map((e, i) => {
				return e
					.getAll()
					.map((x, j) =>
						x !== null && x !== ''
							? { id: (i << 4) + j, text: x }
							: null
					)
					.filter((x): x is Exclude<typeof x, null> => !!x);
			})
			.reduce((p, c) => p.concat(c), []);
	}
	/** Return the string data for ID value, which can be used for Win32API LoadString. */
	public getById(id: number): string | null {
		if (id < 0) {
			return null;
		}
		const entryIndex = id >> 4;
		const entryPos = id & 15;
		const e = this.items[entryIndex];
		return e?.get(entryPos) ?? null;
	}
	/**
	 * Set/overwide the string data for ID value, which can be used for Win32API LoadString.
	 * @param id data ID
	 * @param text string data (entry will be removed if null or empty string is specified)
	 */
	public setById(id: number, text: string | null): void {
		if (id < 0) {
			return;
		}
		const entryIndex = id >> 4;
		const entryPos = id & 15;
		let e = this.items[entryIndex];
		if (!e) {
			this.items[entryIndex] = e = new StringTableItem();
		}
		e.set(entryPos, text);
	}

	/** Generates an array of Entry for resource processings */
	public generateEntries(): Type.ResourceEntry[] {
		return this.items
			.map((e, i): Type.ResourceEntry | null => {
				const len = e.calcByteLength();
				const bin = new ArrayBuffer(len);
				e.generate(bin, 0);
				return {
					type: 6,
					id: i + 1,
					lang: this.lang,
					codepage: 1200,
					bin,
				};
			})
			.filter((e): e is Type.ResourceEntry => !!e);
	}

	/**
	 * Replace all string entries for NtExecutableResource with containing resource data.
	 * The only entries of same language are replaced.
	 */
	public replaceStringEntriesForExecutable(res: NtExecutableResource): void {
		const entries = this.generateEntries();
		const dest = res.entries;
		// first try -- replace same type and same language
		for (let i = 0; i < dest.length; ++i) {
			const e = dest[i];
			if (e != null && e.type === 6 && e.lang === this.lang) {
				for (let j = dest.length - 1; j >= i; --j) {
					const e2 = dest[j];
					if (e2 != null && e2.type === 6 && e2.lang === this.lang) {
						dest.splice(j, 1);
					}
				}
				const f = dest.splice.bind(dest, i, 0);
				f(...entries);
				return;
			}
		}
		// second try -- add entries next to previous language
		for (let i = 0; i < dest.length; ++i) {
			const e = dest[i];
			if (e != null && e.type === 6 && e.lang < this.lang) {
				const f = dest.splice.bind(dest, i + 1, 0);
				f(...entries);
				return;
			}
		}
		// third try -- add entries next to the last 'String' entry
		for (let i = dest.length - 1; i >= 0; --i) {
			const e = dest[i];
			if (e != null && e.type === 6) {
				const f = dest.splice.bind(dest, i + 1, 0);
				f(...entries);
				return;
			}
		}
		// otherwise -- add entries to the last
		dest.push(...entries);
	}
}

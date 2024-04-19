import type DERObject from './data/DERObject.js';
import { RawDERObject } from './data/DERObject.js';
import { OID_SIGNED_DATA } from './data/KnownOids.js';

export function toUint8Array(bin: ArrayBuffer | ArrayBufferView): Uint8Array {
	if ('buffer' in bin) {
		return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
	} else {
		return new Uint8Array(bin);
	}
}

/** @return [length, afterOffset] */
export function calculateDERLength(
	data: number[] | Uint8Array,
	offset: number
): [number, number] {
	let actualLength = 0;
	const value = data[offset];
	if (value == null) {
		throw new Error('Invalid "offset" value');
	} else if (value < 0x80) {
		actualLength = value;
		++offset;
	} else if (value === 0x80) {
		throw new Error('Not supported certificate data (variable length)');
	} else {
		let c = value & 0x7f;
		++offset;
		while (c--) {
			if (offset >= data.length) {
				throw new Error(
					'Invalid certificate data (invalid sequence length)'
				);
			}
			actualLength <<= 8;
			actualLength |= value;
			++offset;
		}
	}
	return [actualLength, offset];
}

function skipField(
	data: number[] | Uint8Array,
	offsetOfDataHead: number
): number {
	const [len, off] = calculateDERLength(data, offsetOfDataHead + 1);
	return off + len;
}

function pickCertificatesIfDERHasSignedData(ub: Uint8Array, offset: number) {
	if (ub.length < offset + 2) {
		return null;
	}
	if (ub[offset] !== 0x30) {
		return null;
	}
	let tempLength: number;
	[tempLength, offset] = calculateDERLength(ub, offset + 1);
	if (tempLength > ub.length - offset) {
		throw new Error('Invalid certificate data (insufficient data length)');
	}

	// if the first item is not contentType, then return
	if (ub[offset] !== 0x6) {
		return null;
	}
	const signedDataOid = OID_SIGNED_DATA.toDER();
	for (let i = 0; i < signedDataOid.length; ++i) {
		if (ub[offset + i] !== signedDataOid[i]) {
			return null;
		}
	}

	// if contentType is OID_SIGNED_DATA, then check sequence format

	// ContentInfo.content
	offset += signedDataOid.length;
	// [0] IMPLICIT
	if (ub[offset] !== 0xa0) {
		throw new Error('Invalid certificate data (no content in contentInfo)');
	}
	[tempLength, offset] = calculateDERLength(ub, offset + 1);
	if (offset + tempLength > ub.length) {
		throw new Error(
			'Invalid certificate data (invalid length for content)'
		);
	}
	// sequence
	if (ub[offset] !== 0x30) {
		throw new Error('Invalid certificate data (unexpected signedData)');
	}
	[tempLength, offset] = calculateDERLength(ub, offset + 1);
	if (offset + tempLength > ub.length) {
		throw new Error(
			'Invalid certificate data (invalid length for signedData)'
		);
	}
	// version
	if (
		ub[offset] !== 0x2 ||
		ub[offset + 1] !== 0x1 ||
		ub[offset + 2] !== 0x1
	) {
		throw new Error(
			'Invalid certificate data (unexpected signedData.version)'
		);
	}
	offset += 3;
	// digestAlgorithms (skip)
	if (ub[offset] !== 0x31) {
		throw new Error(
			'Invalid certificate data (no signedData.digestAlgorithms)'
		);
	}
	[tempLength, offset] = calculateDERLength(ub, offset + 1);
	if (offset + tempLength > ub.length) {
		throw new Error(
			'Invalid certificate data (invalid length for signedData.digestAlgorithms)'
		);
	}
	offset += tempLength;
	// contentInfo (skip)
	if (ub[offset] !== 0x30) {
		throw new Error('Invalid certificate data (no signedData.contentInfo)');
	}
	[tempLength, offset] = calculateDERLength(ub, offset + 1);
	if (offset + tempLength > ub.length) {
		throw new Error(
			'Invalid certificate data (invalid length for signedData.contentInfo)'
		);
	}
	offset += tempLength;
	// certificates
	if (ub[offset] !== 0xa0) {
		throw new Error(
			'Invalid certificate data (no signedData.certificates)'
		);
	}
	const [certsLength, newOffset] = calculateDERLength(ub, offset + 1);
	if (newOffset + certsLength > ub.length) {
		throw new Error(
			'Invalid certificate data (invalid length for signedData.certificates)'
		);
	}
	return ub.subarray(offset, newOffset + certsLength);
}

/** @return [issuer, serialNumber] */
export function pickIssuerAndSerialNumberDERFromCert(
	bin: ArrayBuffer | ArrayBufferView | Array<ArrayBuffer | ArrayBufferView>
): [number[], number[]] {
	if (Array.isArray(bin)) {
		// use first one and call again
		if (bin.length === 0) {
			throw new Error('No data is specified.');
		}
		return pickIssuerAndSerialNumberDERFromCert(bin[0]!);
	}
	const ub = toUint8Array(bin);
	if (ub.length < 2) {
		throw new Error('Invalid certificate data');
	}
	if (ub[0] !== 0x30) {
		throw new Error(
			'Not supported certificate data (non-`Certificate`-format data)'
		);
	}

	const certsBin = pickCertificatesIfDERHasSignedData(ub, 0);
	if (certsBin) {
		// certificates
		const [tempLength, eaten] = calculateDERLength(certsBin, 1);
		if (eaten + tempLength > certsBin.length) {
			throw new Error(
				'Invalid certificate data (invalid length for signedData.certificates)'
			);
		}
		// pick first certificate and call again
		if (certsBin[eaten] !== 0x30) {
			throw new Error(
				'Invalid certificate data (no signedData.certificates[0])'
			);
		}
		const [certLength, tempOffset] = calculateDERLength(
			certsBin,
			eaten + 1
		);
		if (tempOffset + certLength > certsBin.length) {
			throw new Error(
				'Invalid certificate data (invalid length for signedData.certificates[0])'
			);
		}
		return pickIssuerAndSerialNumberDERFromCert(
			certsBin.subarray(eaten, tempOffset + certLength)
		);
	}

	let tempLength: number;
	let eaten: number;
	[tempLength, eaten] = calculateDERLength(ub, 1);
	if (tempLength > ub.length - eaten) {
		throw new Error('Invalid certificate data (insufficient data length)');
	}
	if (ub[eaten] !== 0x30) {
		throw new Error('Invalid certificate data (missing tbsCertificate)');
	}
	// Certificate
	let tbsCertificateLen: number;
	[tbsCertificateLen, eaten] = calculateDERLength(ub, eaten + 1);
	if (tbsCertificateLen > ub.length - eaten) {
		throw new Error(
			'Invalid certificate data (invalid tbsCertificate length)'
		);
	}
	const tbsOffsetLast = eaten + tbsCertificateLen;
	// TBSCertificate
	// :skip version
	if (ub[eaten] === 0xa0) {
		eaten = skipField(ub, eaten);
		if (eaten >= tbsOffsetLast) {
			throw new Error(
				'Invalid certificate data (insufficient tbsCertificate data: after version)'
			);
		}
	}
	// pick serialNumber
	if (ub[eaten] !== 2) {
		throw new Error('Invalid certificate data (invalid serialNumber)');
	}
	const offsetAfterSerialNumber = skipField(ub, eaten);
	if (eaten >= tbsOffsetLast) {
		throw new Error(
			'Invalid certificate data (insufficient tbsCertificate data: after serialNumber)'
		);
	}
	const serialNumberDER: number[] = ([] as number[]).slice.call(
		ub as unknown as number[],
		eaten,
		offsetAfterSerialNumber
	);
	eaten = offsetAfterSerialNumber;
	// :skip algorithmIdentifier
	if (ub[eaten] !== 0x30) {
		throw new Error(
			'Invalid certificate data (invalid algorithmIdentifier)'
		);
	}
	eaten = skipField(ub, eaten);
	if (eaten >= tbsOffsetLast) {
		throw new Error(
			'Invalid certificate data (insufficient tbsCertificate data: after serialNumber)'
		);
	}
	// pick issuer
	// Name ::= CHOICE { RDNSequence }
	// RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
	if (ub[eaten] !== 0x30) {
		throw new Error('Invalid certificate data (invalid issuer)');
	}
	const offsetAfterIssuer = skipField(ub, eaten);
	if (offsetAfterIssuer > tbsOffsetLast) {
		throw new Error(
			'Invalid certificate data (insufficient tbsCertificate data: issuer)'
		);
	}
	return [
		// return entire issuer sequence
		([] as number[]).slice.call(
			ub as unknown as number[],
			eaten,
			offsetAfterIssuer
		),
		serialNumberDER,
	];
}

export function certBinToCertificatesDER(
	bin: ArrayBuffer | ArrayBufferView | Array<ArrayBuffer | ArrayBufferView>
): DERObject[] {
	if (Array.isArray(bin)) {
		// use all items, map with `certBinToCertificatesDER`, and concat all
		return bin
			.map(certBinToCertificatesDER)
			.reduce((prev, cur) => prev.concat(cur), []);
	}
	const ub = toUint8Array(bin);
	const certsBin = pickCertificatesIfDERHasSignedData(ub, 0);
	if (certsBin) {
		// certificates
		const [tempLength, eaten] = calculateDERLength(certsBin, 1);
		if (eaten + tempLength > certsBin.length) {
			throw new Error(
				'Invalid certificate data (invalid length for signedData.certificates)'
			);
		}
		const offsetLast = eaten + tempLength;
		const rawData: RawDERObject[] = [];
		for (let offset = eaten; offset < offsetLast; ) {
			// pick certificates
			if (certsBin[offset] !== 0x30) {
				throw new Error(
					'Invalid certificate data (no signedData.certificates[*])'
				);
			}
			const [certLength, tempOffset] = calculateDERLength(
				certsBin,
				offset + 1
			);
			if (tempOffset + certLength > certsBin.length) {
				throw new Error(
					'Invalid certificate data (invalid length for signedData.certificates[*])'
				);
			}
			rawData.push(
				new RawDERObject(
					certsBin.subarray(offset, tempOffset + certLength)
				)
			);
			offset = tempOffset + certLength;
		}
		return rawData;
	} else {
		return [new RawDERObject(ub)];
	}
}

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
	if (data[offset] < 0x80) {
		actualLength = data[offset];
		++offset;
	} else if (data[offset] === 0x80) {
		throw new Error('Not supported certificate data (variable length)');
	} else {
		let c = data[offset] & 0x7f;
		++offset;
		while (c--) {
			if (offset >= data.length) {
				throw new Error(
					'Invalid certificate data (invalid sequence length)'
				);
			}
			actualLength <<= 8;
			actualLength |= data[offset];
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

/** @return [issuer, serialNumber] */
export function pickIssuerAndSerialNumberDERFromCert(
	bin: ArrayBuffer | ArrayBufferView
): [number[], number[]] {
	const ub = toUint8Array(bin);
	if (ub.length < 2) {
		throw new Error('Invalid certificate data');
	}
	if (ub[0] !== 0x30) {
		throw new Error(
			'Not supported certificate data (non-`Certificate`-format data)'
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
		(ub as unknown) as number[],
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
			(ub as unknown) as number[],
			eaten,
			offsetAfterIssuer
		),
		serialNumberDER,
	];
}

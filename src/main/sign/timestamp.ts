import { allocatePartialBinary } from '../util/functions.js';
import { calculateDERLength, toUint8Array } from './certUtil.js';
import { makeDEROctetString, makeDERSequence } from './data/derUtil.js';
import AlgorithmIdentifier from './data/AlgorithmIdentifier.js';
import { OID_SIGNED_DATA } from './data/KnownOids.js';

export function createTimestampRequest(
	data: ArrayBuffer | ArrayBufferView,
	algorithmIdentifier: AlgorithmIdentifier
): ArrayBufferLike {
	return new Uint8Array(
		makeDERSequence(
			// version
			[0x2, 0x1, 0x1]
				// messageImprint
				.concat(
					makeDERSequence(
						algorithmIdentifier
							.toDER()
							.concat(makeDEROctetString(toUint8Array(data)))
					)
				)
				// certReq
				.concat([0x01, 0x01, 0xff])
		)
	).buffer;
}

export function pickSignedDataFromTimestampResponse(
	data: ArrayBuffer | ArrayBufferView
): ArrayBuffer {
	const ub = toUint8Array(data);
	if (ub.length < 2 || ub[0] !== 0x30) {
		throw new Error('Invalid or unexpected timestamp response');
	}
	let len: number;
	let offset: number;
	[len, offset] = calculateDERLength(ub, 1);
	if (len > ub.length - offset) {
		throw new Error(
			'Invalid or unexpected timestamp response (insufficient buffer)'
		);
	}
	const dataLast = offset + len;
	// status PKIStatusInfo
	if (ub[offset] !== 0x30) {
		throw new Error(
			'Invalid or unexpected timestamp response (no PKIStatusInfo)'
		);
	}
	[len, offset] = calculateDERLength(ub, offset + 1);
	if (offset >= dataLast) {
		throw new Error(
			'Invalid or unexpected timestamp response (invalid length for PKIStatusInfo)'
		);
	}
	const timeStampTokenOffset = offset + len;
	// PKIStatusInfo.status
	if (ub[offset] !== 0x2 || ub[offset + 1] !== 0x1) {
		throw new Error(
			'Invalid or unexpected timestamp response (invalid PKIStatusInfo.status)'
		);
	}
	const status = ub[offset + 2];
	switch (status) {
		case 0: // granted
		case 1: // grantedWithMods
			break;
		case 2: // rejection
		case 3: // waiting
		case 4: // revocationWarning
		case 5: /* revocationNotification */ {
			let msg: string = `Timestamp response has error status ${status}`;
			// PKIStatusInfo.statusString
			if (offset + 3 < timeStampTokenOffset && ub[offset + 3] === 0x30) {
				[len, offset] = calculateDERLength(ub, offset + 4);
				if (
					offset + len <= timeStampTokenOffset &&
					ub[offset] === 0xc
				) {
					[len, offset] = calculateDERLength(ub, offset + 1);
					if (offset + len <= timeStampTokenOffset) {
						const statusString =
							// pick UTF8String body
							([] as number[]).slice
								.call(
									ub as unknown as number[],
									offset,
									offset + len
								)
								// map 0x20<=x<=0x7e values to chars, and other values to '%xx' to be parsed by decodeURIComponent
								.map((val) => {
									if (val >= 0x20 && val <= 0x7e) {
										return String.fromCharCode(val);
									} else {
										let s = val.toString(16);
										if (s.length === 1) {
											s = '0' + s;
										}
										return '%' + s;
									}
								})
								.join('');
						msg += ', text = ' + decodeURIComponent(statusString);
					}
				}
			}
			throw new Error(msg);
		}
		default:
			throw new Error(
				`Unexpected PKIStatusInfo.status: ${status ?? '(unknown)'}`
			);
	}
	// TimeStampToken ::= ContentInfo
	if (
		timeStampTokenOffset + 1 >= dataLast ||
		ub[timeStampTokenOffset] !== 0x30
	) {
		throw new Error(
			'Invalid or unexpected timestamp response (no TimeStampToken)'
		);
	}
	[len, offset] = calculateDERLength(ub, timeStampTokenOffset + 1);
	if (offset + len > dataLast) {
		throw new Error(
			'Invalid or unexpected timestamp response (insufficient data for TimeStampToken)'
		);
	}
	// ContentInfo.contentType
	const signedDataOid = OID_SIGNED_DATA.toDER();
	if (ub[offset] !== 0x6) {
		throw new Error(
			'Invalid or unexpected timestamp response (no contentType in TimeStampToken)'
		);
	}
	for (let i = 0; i < signedDataOid.length; ++i) {
		if (ub[offset + i] !== signedDataOid[i]) {
			throw new Error(
				'Invalid or unexpected timestamp response (unexpected TimeStampToken.contentType octet)'
			);
		}
	}
	// ContentInfo.content
	offset += signedDataOid.length;
	// [0] IMPLICIT
	if (ub[offset] !== 0xa0) {
		throw new Error(
			'Invalid or unexpected timestamp response (no content in TimeStampToken)'
		);
	}
	[len, offset] = calculateDERLength(ub, offset + 1);
	if (offset + len > dataLast) {
		throw new Error(
			'Invalid or unexpected timestamp response (invalid length for TimeStampToken.content)'
		);
	}
	// return content data (=== SignedData)
	return allocatePartialBinary(ub, offset, len);
}

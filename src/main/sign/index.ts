// refs.
// - Windows Authenticode Portable Executable Signature Format
//   https://download.microsoft.com/download/9/c/5/9c5b2167-8017-4bae-9fde-d599bac8184a/authenticode_pe.docx
// - RFC 2315 - PKCS #7: Cryptographic Message Syntax Version 1.5
//   https://tools.ietf.org/html/rfc2315
// - RFC 3280 - Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile
//   https://tools.ietf.org/html/rfc3280
// - Object IDs associated with Microsoft cryptography
//   https://support.microsoft.com/en-us/help/287547/object-ids-associated-with-microsoft-cryptography
// - OID repository
//   http://oid-info.com/
// - RFC 3161 - Internet X.509 Public Key Infrastructure Time-Stamp Protocol (TSP)
//   https://tools.ietf.org/html/rfc3161
// - mono/AuthenticodeDeformatter.cs
//   https://github.com/mono/mono/blob/master/mcs/class/Mono.Security/Mono.Security.Authenticode/AuthenticodeDeformatter.cs

import SignerObject, {
	DigestAlgorithmType,
	EncryptionAlgorithmType,
} from './SignerObject';

import NtExecutable from '../NtExecutable';
import ImageDataDirectoryArray from '../format/ImageDataDirectoryArray';
import ImageDirectoryEntry from '../format/ImageDirectoryEntry';
import ImageSectionHeaderArray from '../format/ImageSectionHeaderArray';
import {
	allocatePartialBinary,
	calculateCheckSumForPE,
	cloneToArrayBuffer,
	copyBuffer,
	roundUp,
} from '../util/functions';

import {
	certBinToCertificatesDER,
	pickIssuerAndSerialNumberDERFromCert,
	toUint8Array,
} from './certUtil';
import AlgorithmIdentifier from './data/AlgorithmIdentifier';
import CertificateDataRoot from './data/CertificateDataRoot';
import { RawDERObject } from './data/DERObject';
import DigestInfo from './data/DigestInfo';
import IssuerAndSerialNumber from './data/IssuerAndSerialNumber';
import * as KnownOids from './data/KnownOids';
import SignedData from './data/SignedData';
import SignerInfo from './data/SignerInfo';
import SpcIndirectDataContent, {
	SpcIndirectDataContentInfo,
	SPC_INDIRECT_DATA_OBJID,
} from './data/SpcIndirectDataContent';
import SpcPeImageData, {
	SpcPeImageAttributeTypeAndOptionalValue,
	SpcPeImageFlags,
} from './data/SpcPeImageData';
import { SpcLinkFile } from './data/SpcLink';
import Attribute from './data/Attribute';
import {
	arrayToDERSet,
	makeDEROctetString,
	makeDERSequence,
} from './data/derUtil';
import ContentInfo from './data/ContentInfo';
import ObjectIdentifier from './data/ObjectIdentifier';
import {
	createTimestampRequest,
	pickSignedDataFromTimestampResponse,
} from './timestamp';

type AnyBinary = ArrayBuffer | ArrayBufferView;

function makeSimpleIterator<T>(data: T): Iterator<T> {
	let done = false;
	return {
		next() {
			if (done) {
				return {
					done: true,
					value: undefined,
				};
			} else {
				done = true;
				return {
					done: false,
					value: data,
				};
			}
		},
	};
}

function calculateExecutableDigest(
	executable: NtExecutable,
	signer: SignerObject
) {
	function* inner() {
		const checkSumOffset = executable.dosHeader.newHeaderAddress + 88;
		const certificateTableOffset =
			executable.dosHeader.newHeaderAddress +
			executable.newHeader.getDataDirectoryOffset() +
			ImageDataDirectoryArray.itemSize * ImageDirectoryEntry.Certificate;

		const rawHeader = executable.getRawHeader();
		// gather sections
		// NOTE: 'Certificate Table' section is not a real section, so
		// getAllSections() does not contain 'Certificate Table'
		const targetSections = executable.getAllSections();
		const sectionCount = targetSections.length;
		// section start offset is not aligned, but
		// end offset is aligned, because the immediate next data is
		// actual section data which must be aligned
		const sectionStartOffset = rawHeader.byteLength;
		const sectionEndOffset = roundUp(
			sectionStartOffset +
				sectionCount * ImageSectionHeaderArray.itemSize,
			executable.getFileAlignment()
		);
		const sectionHeadersSize = sectionEndOffset - sectionStartOffset;
		// make dummy section header binary
		const secHeader = new ArrayBuffer(sectionHeadersSize);
		{
			const secArray = ImageSectionHeaderArray.from(
				secHeader,
				sectionCount
			);
			targetSections.forEach((sec, i) => {
				secArray.set(i, sec.info);
			});
		}

		// pick from head to immediately before checksum
		yield allocatePartialBinary(rawHeader, 0, checkSumOffset);
		// pick from the end of checksum to immediately before 'Certificate Table' header
		yield allocatePartialBinary(
			rawHeader,
			checkSumOffset + 4,
			certificateTableOffset - (checkSumOffset + 4)
		);

		// pick from the end of 'Certificate Table' header to the end
		{
			const off =
				certificateTableOffset + ImageDataDirectoryArray.itemSize;
			yield allocatePartialBinary(
				executable.getRawHeader(),
				off,
				executable.getTotalHeaderSize() - off
			);
		}

		// pick section header
		yield secHeader;

		// pick all sections
		for (const section of targetSections) {
			if (section.data) {
				yield section.data;
			}
		}
		// (if there is another data, then `yield` it)
	}

	return signer.digestData(inner());
}

function getAlgorithmIdentifierObject(type: DigestAlgorithmType | number[]) {
	if (typeof type !== 'string') {
		return new AlgorithmIdentifier(new ObjectIdentifier(type));
	}
	switch (type) {
		case 'sha1':
		case 'SHA1':
			return new AlgorithmIdentifier(KnownOids.OID_SHA1_NO_SIGN);
		case 'sha256':
		case 'SHA256':
			return new AlgorithmIdentifier(KnownOids.OID_SHA256_NO_SIGN);
		case 'sha384':
		case 'SHA384':
			return new AlgorithmIdentifier(KnownOids.OID_SHA384_NO_SIGN);
		case 'sha512':
		case 'SHA512':
			return new AlgorithmIdentifier(KnownOids.OID_SHA512_NO_SIGN);
		case 'sha224':
		case 'SHA224':
			return new AlgorithmIdentifier(KnownOids.OID_SHA224_NO_SIGN);
		case 'sha512-224':
		case 'SHA512-224':
			return new AlgorithmIdentifier(KnownOids.OID_SHA512_224_NO_SIGN);
		case 'sha512-256':
		case 'SHA512-256':
			return new AlgorithmIdentifier(KnownOids.OID_SHA512_256_NO_SIGN);
		case 'sha3-224':
		case 'SHA3-224':
			return new AlgorithmIdentifier(KnownOids.OID_SHA3_224_NO_SIGN);
		case 'sha3-256':
		case 'SHA3-256':
			return new AlgorithmIdentifier(KnownOids.OID_SHA3_256_NO_SIGN);
		case 'sha3-384':
		case 'SHA3-384':
			return new AlgorithmIdentifier(KnownOids.OID_SHA3_384_NO_SIGN);
		case 'sha3-512':
		case 'SHA3-512':
			return new AlgorithmIdentifier(KnownOids.OID_SHA3_512_NO_SIGN);
		case 'shake128':
		case 'SHAKE128':
			return new AlgorithmIdentifier(KnownOids.OID_SHAKE128_NO_SIGN);
		case 'shake256':
		case 'SHAKE256':
			return new AlgorithmIdentifier(KnownOids.OID_SHAKE256_NO_SIGN);
		default:
			throw new Error('Invalid or unsupported digest algorithm');
	}
}

export function generateExecutableWithSign(
	executable: NtExecutable,
	signer: SignerObject
): PromiseLike<ArrayBuffer> {
	const digestAlgorithm = getAlgorithmIdentifierObject(
		signer.getDigestAlgorithm()
	);
	let digestEncryptionAlgorithm: AlgorithmIdentifier;
	const a = signer.getEncryptionAlgorithm();
	if (typeof a !== 'string') {
		digestEncryptionAlgorithm = new AlgorithmIdentifier(
			new ObjectIdentifier(a)
		);
	} else {
		switch (a) {
			case 'rsa':
			case 'RSA':
				digestEncryptionAlgorithm = new AlgorithmIdentifier(
					KnownOids.OID_RSA
				);
				break;
			case 'dsa':
			case 'DSA':
				digestEncryptionAlgorithm = new AlgorithmIdentifier(
					KnownOids.OID_DSA
				);
				break;
			default:
				throw new Error(
					'Invalid or unsupported digest encryption algorithm'
				);
		}
	}

	const cert = signer.getCertificateData
		? signer.getCertificateData()
		: signer.getPublicKeyData!();
	const [issuer, serialNumber] = pickIssuerAndSerialNumberDERFromCert(cert);

	return (
		// calculate digest
		calculateExecutableDigest(executable, signer)
			// make content, content's digest, and sign
			.then((digest) => {
				const content = new SpcIndirectDataContent(
					new SpcPeImageAttributeTypeAndOptionalValue(
						new SpcPeImageData(
							SpcPeImageFlags.IncludeResources,
							new SpcLinkFile('')
						)
					),
					new DigestInfo(digestAlgorithm, digest)
				);

				return (
					signer
						.digestData(
							makeSimpleIterator(
								new Uint8Array(content.toDERWithoutHeader())
									.buffer
							)
						)
						// make sign
						.then((contentDigest) => {
							const attributes = [
								new Attribute(
									KnownOids.OID_SPC_SP_OPUS_INFO_OBJID,
									// (SpcSpOpusInfo) null sequence
									[new RawDERObject([0x30, 0x00])]
								),
								new Attribute(KnownOids.OID_CONTENT_TYPE, [
									SPC_INDIRECT_DATA_OBJID,
								]),
								new Attribute(
									KnownOids.OID_SPC_STATEMENT_TYPE_OBJID,
									[
										new RawDERObject(
											makeDERSequence(
												KnownOids.OID_SPC_INDIVIDUAL_SP_KEY_PURPOSE_OBJID.toDER()
											)
										),
									]
								),
								new Attribute(KnownOids.OID_MESSAGE_DIGEST, [
									new RawDERObject(
										makeDEROctetString(
											toUint8Array(contentDigest)
										)
									),
								]),
							];
							// get digest of 'attributes' set
							const attrBin = new Uint8Array(
								arrayToDERSet(attributes)
							).buffer;
							return signer
								.digestData(makeSimpleIterator(attrBin))
								.then((digestAttributes) => {
									// encrypting DigestInfo with digest of 'attributes' set
									const digestInfoBin = new Uint8Array(
										new DigestInfo(
											digestAlgorithm,
											digestAttributes
										).toDER()
									).buffer;
									return signer.encryptData(
										makeSimpleIterator(digestInfoBin)
									);
								})
								.then((signed): [
									SpcIndirectDataContent,
									Attribute[],
									AnyBinary
								] => {
									return [content, attributes, signed];
								});
						})
				);
			})
			// make cert bin
			.then(([content, attributes, signed]):
				| [SpcIndirectDataContent, SignerInfo]
				| PromiseLike<[SpcIndirectDataContent, SignerInfo]> => {
				const signerInfo = new SignerInfo(
					// version
					1,
					// issuerAndSerialNumber
					new IssuerAndSerialNumber(
						new RawDERObject(issuer),
						new RawDERObject(serialNumber)
					),
					// digestAlgorithm
					digestAlgorithm,
					// digestEncryptionAlgorithm
					digestEncryptionAlgorithm,
					// encryptedDigest
					toUint8Array(signed),
					// authenticatedAttributes
					attributes
				);
				if (!signer.timestampData) {
					return [content, signerInfo];
				}
				// timestamp
				return (
					signer
						// make digest of encrypted data for make timestamp
						.digestData(
							makeSimpleIterator(cloneToArrayBuffer(signed))
						)
						.then((digestEncryptedBase) => {
							const digestEncrypted = createTimestampRequest(
								digestEncryptedBase,
								digestAlgorithm
							);
							// request timestamp
							return signer.timestampData!(digestEncrypted).then(
								(
									timestamp
								): [SpcIndirectDataContent, SignerInfo] => {
									// pick up signedData
									const timestampSignedData = pickSignedDataFromTimestampResponse(
										timestamp
									);
									// add timestamp to 'unauthenticatedAttributes'
									signerInfo.unauthenticatedAttributes = [
										new Attribute(
											KnownOids.OID_RFC3161_COUNTER_SIGNATURE,
											[
												new ContentInfo(
													KnownOids.OID_SIGNED_DATA,
													new RawDERObject(
														toUint8Array(
															timestampSignedData
														)
													)
												),
											]
										),
									];
									return [content, signerInfo];
								}
							);
						})
				);
			})
			.then(
				([content, signerInfo]): ArrayBuffer => {
					// make certificate data
					const root = new CertificateDataRoot(
						KnownOids.OID_SIGNED_DATA,
						new SignedData(
							// version
							1,
							// digestAlgorithms
							[digestAlgorithm],
							// contentInfo
							new SpcIndirectDataContentInfo(content),
							// signerInfos
							[signerInfo],
							// certificates
							certBinToCertificatesDER(cert)
						)
					);
					const certBin = new Uint8Array(root.toDER());
					const resultBin = new ArrayBuffer(8 + certBin.length);
					// make WIN_CERTIFICATE
					const resultView = new DataView(resultBin);
					// dwLength
					resultView.setUint32(0, certBin.length + 8, true);
					// wRevision : 0x0200 (revision 2)
					resultView.setUint16(4, 0x200, true);
					// wCertificateType : 0x0002
					resultView.setUint16(6, 0x2, true);
					copyBuffer(resultBin, 8, certBin, 0, certBin.byteLength);

					return resultBin;
				}
			)
			.then((certBin) => {
				const alignedSize = roundUp(
					certBin.byteLength,
					executable.getFileAlignment()
				);
				const newBin = executable.generate(alignedSize);
				const certOffset = newBin.byteLength - alignedSize;
				// rewrite directory data
				const dirArray = ImageDataDirectoryArray.from(
					newBin,
					executable.dosHeader.newHeaderAddress +
						executable.newHeader.getDataDirectoryOffset()
				);
				dirArray.set(ImageDirectoryEntry.Certificate, {
					size: alignedSize,
					virtualAddress: certOffset,
				});
				// recalculate checksum
				calculateCheckSumForPE(newBin, true);
				// write Certificate section data
				copyBuffer(newBin, certOffset, certBin, 0, certBin.byteLength);
				return newBin;
			})
	);
}

export { SignerObject, DigestAlgorithmType, EncryptionAlgorithmType };

/** Predefined algorithm types */
export type DigestAlgorithmType =
	| 'sha1'
	| 'sha224'
	| 'sha256'
	| 'sha384'
	| 'sha512'
	| 'sha512-224'
	| 'sha512-256'
	| 'sha3-224'
	| 'sha3-256'
	| 'sha3-384'
	| 'sha3-512'
	| 'shake128'
	| 'shake256'
	| 'SHA1'
	| 'SHA224'
	| 'SHA256'
	| 'SHA384'
	| 'SHA512'
	| 'SHA512-224'
	| 'SHA512-256'
	| 'SHA3-224'
	| 'SHA3-256'
	| 'SHA3-384'
	| 'SHA3-512'
	| 'SHAKE128'
	| 'SHAKE256';
export type EncryptionAlgorithmType = 'rsa' | 'dsa' | 'RSA' | 'DSA';

/* eslint-disable @typescript-eslint/method-signature-style */
export default interface SignerObject {
	/**
	 * Returns the digest algorithm used in `digestData`.
	 * To use the algorithm other than defined in `DigestAlgorithmType`,
	 * return an integer array of values from OID string.
	 * (e.g. [1,3,14,3,2,26] for 'sha1')
	 *
	 * @note
	 * The newer digest algorithm (including SHA224, SHA512-256, SHA3 algorithms, etc.)
	 * might not be supported by Windows.
	 */
	getDigestAlgorithm(): DigestAlgorithmType | number[];
	/**
	 * Returns the encryption algorithm used in `encryptData`.
	 * To use the algorithm other than defined in `EncryptionAlgorithmType`,
	 * return an integer array of values from OID string.
	 * (e.g. [1,2,840,113549,1,1,1] for 'rsa')
	 */
	getEncryptionAlgorithm(): EncryptionAlgorithmType | number[];
	/**
	 * Returns the certificate data, which format is DER binary (X.509 certificate data
	 * or '.p7b' file data which is based on DER and contains certificates).
	 *
	 * You can return an `Array` (not an `ArrayLike`), which contains one or more certificates in format above.
	 * In this case, each certificates are stored to signed data in order.
	 * Note that this library does not sort certificates, so the implementation should have responsible for the order of certificates.
	 */
	getCertificateData():
		| ArrayBuffer
		| ArrayBufferView
		| Array<ArrayBuffer | ArrayBufferView>;
	/**
	 * Returns the public key data, which format is DER binary (X.509 Public Key or '.p7b' file data which is based on DER).
	 *
	 * You can return an `Array` (not an `ArrayLike`), which contains one or more public keys in format above.
	 * In this case, each public keys are stored to signed data in order.
	 * Note that this library does not sort public keys, so the implementation should have responsible for the order of keys.
	 *
	 * @deprecated This method is renamed to {@link getCertificateData} due to the actual purpose of this method
	 *   and `getPublicKeyData` will no longer be used in the future.
	 */
	getPublicKeyData?():
		| ArrayBuffer
		| ArrayBufferView
		| Array<ArrayBuffer | ArrayBufferView>;
	/**
	 * Digests specified data. The digest algorithm type must be same as the result of `getDigestAlgorithm`.
	 * Must pick all data from `dataIterator` (until `dataIterator.next().done` is `true`).
	 */
	digestData(
		dataIterator: Iterator<ArrayBuffer, void>
	): PromiseLike<ArrayBuffer | ArrayBufferView>;
	/**
	 * Encrypts specified data with **private key** (i.e. can be verified with the public key from `getCertificateData`). The private key type (algorithm) must be same as the result of `getEncryptionAlgorithm`.
	 * Must pick all data from `dataIterator` (until `dataIterator.next().done` is `true`).
	 *
	 * This method must be implemented if `signData` is not implemented.
	 */
	encryptData?(
		dataIterator: Iterator<ArrayBuffer, void>
	): PromiseLike<ArrayBuffer | ArrayBufferView>;
	/**
	 * Signs specified data with **private key** (i.e. can be verified with the public key from `getCertificateData`).
	 * The private key type (algorithm) must be same as the result of `getEncryptionAlgorithm`, and the digest algorithm must be same as the result of `getDigestAlgorithm`.
	 * Must pick all data from `dataIterator` (until `dataIterator.next().done` is `true`).
	 *
	 * This method must be implemented if `encryptData` is not implemented.
	 *
	 * Note that even if `signData` is implemented, `digestData` must be implemented.
	 */
	signData?(
		dataIterator: Iterator<ArrayBuffer, void>
	): PromiseLike<ArrayBuffer | ArrayBufferView>;
	/**
	 * Make 'timestamp' data, generated by TSA, from specified data (omit this method if not using timestamp).
	 * Must return entire timestamp response data.
	 * @param reqData timestamp request data (`TimeStampReq`) to send to TSA
	 */
	timestampData?(
		reqData: ArrayBuffer
	): PromiseLike<ArrayBuffer | ArrayBufferView>;
}
/* eslint-enable @typescript-eslint/method-signature-style */

export type DigestAlgorithmType = 'sha1' | 'sha256' | 'SHA1' | 'SHA256';
export type EncryptionAlgorithmType = 'rsa' | 'dsa' | 'RSA' | 'DSA';

export default interface SignerObject {
	getDigestAlgorithm(): DigestAlgorithmType;
	getEncryptionAlgorithm(): EncryptionAlgorithmType;
	/**
	 * Returns the public key data, which format is DER binary (X.509 Public Key or '.p7b' file data which is based on DER).
	 */
	getPublicKeyData(): ArrayBuffer | ArrayBufferView;
	/**
	 * Digests specified data. The digest algorithm type must be same as the result of `getDigestAlgorithm`.
	 * Must pick all data from `dataIterator` (until `dataIterator.next().done` is `true`).
	 */
	digestData(
		dataIterator: Iterator<ArrayBuffer, void>
	): PromiseLike<ArrayBuffer | ArrayBufferView>;
	/**
	 * Encrypts specified data with **private key** (i.e. can be decrypted by the public key from `getPublicKeyData`). The private key type (algorithm) must be same as the result of `getEncryptionAlgorithm`.
	 * Must pick all data from `dataIterator` (until `dataIterator.next().done` is `true`).
	 */
	encryptData(
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
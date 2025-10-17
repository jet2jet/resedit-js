import { NtExecutable, NtExecutableResource, Format } from 'pe-library';
import * as Data from './data/index.js';
import * as Resource from './resource/index.js';
import {
	generateExecutableWithSign,
	type SignerObject,
	type DigestAlgorithmType,
	type EncryptionAlgorithmType,
} from './sign/index.js';
import version from './version.js';

export {
	NtExecutable,
	NtExecutableResource,
	version,
	Data,
	Format,
	Resource,
	generateExecutableWithSign,
	type SignerObject,
	type DigestAlgorithmType,
	type EncryptionAlgorithmType,
};

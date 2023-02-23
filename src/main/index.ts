import { NtExecutable, NtExecutableResource, Format } from 'pe-library';
import version from './version.js';

import * as Data from './data/index.js';
import * as Resource from './resource/index.js';

import {
	generateExecutableWithSign,
	type SignerObject,
	type DigestAlgorithmType,
	type EncryptionAlgorithmType,
} from './sign/index.js';

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

// this file is used for building with tsconfig.app.json
// which does not load @types/node
/// <reference lib='es2020.bigint' />

interface DummyBuffer extends Uint8Array {
	toString(encoding?: string): string;
}
interface DummyBufferConstructor {
	from(data: string, encoding: string): DummyBuffer;
	from(data: ArrayBuffer, offset?: number, length?: number): DummyBuffer;
}
// @ts-ignore: Avoid reporting errors in editors
declare let Buffer: undefined | DummyBufferConstructor;

import type {Serializer} from 'synqable';

// Serialization
const replacer = (key: string, value: unknown) =>
	typeof value === 'bigint' ? value.toString() + 'n' : value;

// Deserialization
const reviver = (key: string, value: unknown) => {
	if (typeof value === 'string' && /^\d+n$/.test(value)) {
		return BigInt(value.slice(0, -1));
	}
	return value;
};
export const serializer: Serializer<any> = {
	serialize: (data: any) => JSON.stringify(data, replacer),
	deserialize: (data: string) => JSON.parse(data, reviver),
};

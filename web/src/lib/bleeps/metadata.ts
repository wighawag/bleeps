/**
 * Read the metadata out of an on-chain `data:application/json,...` token URI.
 *
 * The payload is percent-encoded, because that is what a data URL is: the
 * contract emits `"name":"NOISE%20D2"`. A browser fetching the URL would decode
 * it, so anything reading the string directly has to as well, or names show up
 * with `%20` in them and a download lands as `NOISE%20D2.wav`.
 */
export type TokenMetadata = {
	name: string;
	image: string;
	animation_url: string;
	description?: string;
};

const JSON_PREFIX = 'data:application/json,';

export function parseTokenURI(tokenURI: string): TokenMetadata {
	if (!tokenURI.startsWith(JSON_PREFIX)) {
		throw new Error('not a JSON data URI');
	}
	const payload = tokenURI.slice(JSON_PREFIX.length);

	let decoded: string;
	try {
		decoded = decodeURIComponent(payload);
	} catch {
		// A stray `%` that is not a valid escape would throw. Better to show the
		// metadata with its escapes intact than to fail outright.
		decoded = payload;
	}

	return JSON.parse(decoded);
}

/**
 * Read the metadata out of an on-chain `data:application/json,...` token URI.
 *
 * The two contracts behave differently, and both have to work:
 *
 *   Bleeps percent-encodes its strings, as a data URL requires: `tokenURI`
 *   returns `"name":"NOISE%20D2"`. A browser fetching the URL would decode that,
 *   so anything reading the string has to as well, or names show their escapes
 *   and a download lands as `NOISE%20D2.wav`.
 *
 *   MeloBleeps does NOT encode: it splices the melody name straight into the
 *   JSON. Its names therefore need no decoding.
 *
 * Decoding is done per FIELD rather than over the whole payload, because the
 * payload legitimately contains bare `%` characters: MeloBleeps embeds an inline
 * SVG containing `x='50%'`, so `decodeURIComponent` on the whole thing always
 * throws. Relying on that throw to skip decoding would work by accident and
 * break the moment either contract's SVG changed.
 */
export type TokenMetadata = {
	name: string;
	image: string;
	animation_url: string;
	description?: string;
};

const JSON_PREFIX = 'data:application/json,';

/**
 * Percent-decode one field, leaving it alone if it is not valid encoding.
 *
 * An un-encoded MeloBleeps name is the normal case here, not an error.
 */
function decodeField(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parseTokenURI(tokenURI: string): TokenMetadata {
	if (!tokenURI.startsWith(JSON_PREFIX)) {
		throw new Error('not a JSON data URI');
	}

	// The JSON itself parses raw; only its string values may carry escapes.
	const parsed = JSON.parse(tokenURI.slice(JSON_PREFIX.length));

	return {
		...parsed,
		name: decodeField(parsed.name ?? ''),
		description:
			parsed.description === undefined
				? undefined
				: decodeField(parsed.description),
		// image and animation_url are data URLs in their own right and are handed
		// straight to the browser, which does its own decoding.
		image: parsed.image,
		animation_url: parsed.animation_url,
	};
}

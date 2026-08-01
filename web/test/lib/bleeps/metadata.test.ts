import {describe, expect, it} from 'vitest';
import {parseTokenURI} from '$lib/bleeps/metadata';

const uri = (payload: string) => `data:application/json,${payload}`;

describe('parseTokenURI', () => {
	it('decodes the percent-escapes a data URL carries', () => {
		// what Bleeps actually returns: the space in "NOISE D2" is escaped
		const parsed = parseTokenURI(
			uri('{"name":"NOISE%20D2","image":"i","animation_url":"a"}'),
		);

		expect(parsed.name).toEqual('NOISE D2');
	});

	it('leaves base64 payloads alone', () => {
		// `+`, `/` and `=` are not percent-escapes and must survive untouched, or
		// the WAV is corrupted
		const wav = 'data:audio/wav;base64,UklGRg+/aGk=';
		const parsed = parseTokenURI(
			uri(`{"name":"n","image":"i","animation_url":"${wav}"}`),
		);

		expect(parsed.animation_url).toEqual(wav);
	});

	it('falls back to the raw payload on an invalid escape', () => {
		// a lone `%` would make decodeURIComponent throw; showing the escapes is
		// better than failing to render the Bleep at all
		const parsed = parseTokenURI(
			uri('{"name":"100%","image":"i","animation_url":"a"}'),
		);

		expect(parsed.name).toEqual('100%');
	});

	it('refuses something that is not a JSON data URI', () => {
		expect(() => parseTokenURI('data:audio/wav;base64,AAAA')).toThrow();
		expect(() => parseTokenURI('')).toThrow();
	});
});

describe('parseTokenURI, against what the contracts really emit', () => {
	// Bleeps percent-encodes; MeloBleeps does not and embeds an SVG with a bare
	// `%`, so a whole-payload decodeURIComponent throws on it. Both must work.
	it('decodes a Bleeps name', () => {
		const parsed = parseTokenURI(
			uri('{"name":"NOISE%20D2","image":"i","animation_url":"a"}'),
		);
		expect(parsed.name).toEqual('NOISE D2');
	});

	it('leaves a MeloBleeps name alone, SVG percent and all', () => {
		const svg = "data:image/svg+xml,<svg><text x='50%' y='50%'>hi</text></svg>";
		const parsed = parseTokenURI(
			uri(`{"name":"two words","image":"${svg}","animation_url":"a"}`),
		);
		// would have thrown if the whole payload were decoded
		expect(parsed.name).toEqual('two words');
		expect(parsed.image).toEqual(svg);
	});
});

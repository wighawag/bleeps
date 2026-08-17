/**
 * Pull the WAV out of a tokenURI and check it is really a WAV.
 *
 * The web app hands `animation_url` straight to an `<audio>` element, which
 * fails silently on malformed input: a broken header shows up as a player that
 * renders and simply never plays. Asserting the string starts with
 * `data:audio/wav;base64,` catches nothing, so this parses the container.
 */

export type WavInfo = {
	audioFormat: number;
	channels: number;
	sampleRate: number;
	bitsPerSample: number;
	/** As declared in the RIFF header. */
	declaredRiffSize: number;
	/** As declared in the data chunk header. */
	declaredDataSize: number;
	/** How many bytes of samples are actually present. */
	actualDataSize: number;
	samples: Uint8Array;
};

export type Metadata = {
	name: string;
	description: string;
	image: string;
	animation_url: string;
};

const JSON_PREFIX = 'data:application/json,';
const WAV_PREFIX = 'data:audio/wav;base64,';

export function parseMetadata(tokenURI: string): Metadata {
	if (!tokenURI.startsWith(JSON_PREFIX)) {
		throw new Error(`not a JSON data URI: ${tokenURI.slice(0, 40)}...`);
	}
	return JSON.parse(tokenURI.slice(JSON_PREFIX.length));
}

export function parseWav(animationUrl: string): WavInfo {
	if (!animationUrl.startsWith(WAV_PREFIX)) {
		throw new Error(`not a WAV data URI: ${animationUrl.slice(0, 40)}...`);
	}
	const bytes = Buffer.from(animationUrl.slice(WAV_PREFIX.length), 'base64');

	if (bytes.length < 44) {
		throw new Error(`too short to be a WAV: ${bytes.length} bytes`);
	}
	if (bytes.toString('ascii', 0, 4) !== 'RIFF') {
		throw new Error(`no RIFF tag`);
	}
	if (bytes.toString('ascii', 8, 12) !== 'WAVE') {
		throw new Error(`no WAVE tag`);
	}
	if (bytes.toString('ascii', 12, 16) !== 'fmt ') {
		throw new Error(`no fmt chunk`);
	}
	if (bytes.toString('ascii', 36, 40) !== 'data') {
		throw new Error(`no data chunk where one is expected (offset 36)`);
	}

	return {
		audioFormat: bytes.readUInt16LE(20),
		channels: bytes.readUInt16LE(22),
		sampleRate: bytes.readUInt32LE(24),
		bitsPerSample: bytes.readUInt16LE(34),
		declaredRiffSize: bytes.readUInt32LE(4),
		declaredDataSize: bytes.readUInt32LE(40),
		actualDataSize: bytes.length - 44,
		samples: new Uint8Array(bytes.subarray(44)),
	};
}

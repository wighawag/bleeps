import {describe, it, expect} from 'vitest';
import {extractHexParam} from '../../../src/routes/explorer/lib/location-param';

const HASH = '0x' + 'a'.repeat(64);
const ADDR = '0x' + '1'.repeat(40);

describe('extractHexParam', () => {
	it('prefers the URL hash when it is a 0x value', () => {
		expect(
			extractHexParam('tx', {hash: `#${HASH}`, pathname: '/explorer/tx/'}),
		).toBe(HASH);
	});

	it('falls back to the pathname for the matching segment', () => {
		expect(
			extractHexParam('address', {
				hash: '',
				pathname: `/explorer/address/${ADDR}`,
			}),
		).toBe(ADDR);
	});

	it('returns null when neither matches', () => {
		expect(extractHexParam('tx', {hash: '', pathname: '/explorer'})).toBeNull();
		expect(
			extractHexParam('tx', {hash: '#notahex', pathname: '/explorer/tx/'}),
		).toBeNull();
	});

	it('does not match the wrong segment in the pathname', () => {
		expect(
			extractHexParam('tx', {hash: '', pathname: `/explorer/address/${ADDR}`}),
		).toBeNull();
	});
});

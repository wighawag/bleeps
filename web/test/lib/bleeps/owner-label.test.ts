import {describe, expect, it} from 'vitest';
import {MAX_OWNER_LABEL_LENGTH, ownerLabel} from '$lib/bleeps/owner-label';

const OWNER = '0x1234567890abcdef1234567890abcdef12345678';

describe('the owner line on a tile', () => {
	it('falls back to the truncated address when there is no name', () => {
		expect(ownerLabel(OWNER)).toBe('0x1234...5678');
		expect(ownerLabel(OWNER, null)).toBe('0x1234...5678');
	});

	it('writes nothing when there is no owner', () => {
		expect(ownerLabel(undefined, 'someone.eth')).toBe('');
	});

	it('prefers a name that fits as it is', () => {
		expect(ownerLabel(OWNER, 'wighawag.eth')).toBe('wighawag.eth');
	});

	it('keeps the top-level label when cutting a long name down', () => {
		const label = ownerLabel(OWNER, 'averyveryverylongname.eth');
		expect(label.endsWith('...eth')).toBe(true);
		expect(label.length).toBeLessThanOrEqual(MAX_OWNER_LABEL_LENGTH);
	});

	it('cuts names with no usable tail from the end', () => {
		// A long tail would eat the whole line, so it is dropped rather than kept.
		const label = ownerLabel(OWNER, 'name.averylongtopleveldomain');
		expect(label).toBe('name.averylongt...');
		expect(label.length).toBeLessThanOrEqual(MAX_OWNER_LABEL_LENGTH);
	});
});

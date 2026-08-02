import {describe, expect, it} from 'vitest';
import {bleepsMode, idsForSale, isCreatorReserved} from '$lib/sale/mode';
import {NUM_BLEEPS} from '$lib/onchain/state';

const ZERO = '0x0000000000000000000000000000000000000000';
const SOMEBODY = '0x1111111111111111111111111111111111111111';

/** An owners table with every Bleep unminted. */
function noneMinted(): string[] {
	return Array.from({length: NUM_BLEEPS}, () => ZERO);
}

/** An owners table with every Bleep owned, which is what mainnet looks like. */
function allMinted(): string[] {
	return Array.from({length: NUM_BLEEPS}, () => SOMEBODY);
}

describe('isCreatorReserved', () => {
	it('covers instruments 7 and 8 and nothing else', () => {
		expect(isCreatorReserved(447)).toBe(false); // last of instrument 6
		expect(isCreatorReserved(448)).toBe(true); // first of instrument 7
		expect(isCreatorReserved(575)).toBe(true); // last of instrument 8
		expect(isCreatorReserved(0)).toBe(false);
	});
});

describe('bleepsMode', () => {
	it('is browse where no sale was ever deployed', () => {
		// `demo` has no sale contract, so there is nothing to mint with even
		// though most Bleeps there are unminted
		expect(bleepsMode({owners: noneMinted(), saleDeployed: false})).toEqual(
			'browse',
		);
	});

	it('is mint while a deployed sale still has something to sell', () => {
		expect(bleepsMode({owners: noneMinted(), saleDeployed: true})).toEqual(
			'mint',
		);
	});

	it('is browse once everything is sold, which is mainnet', () => {
		expect(bleepsMode({owners: allMinted(), saleDeployed: true})).toEqual(
			'browse',
		);
	});

	it('does not call the creator-reserved instruments a sale', () => {
		// 7 and 8 can only ever be minted by the creator, so leaving them unminted
		// is not something a buyer could act on
		const owners = allMinted();
		owners[448] = ZERO;
		owners[575] = ZERO;
		expect(bleepsMode({owners, saleDeployed: true})).toEqual('browse');
	});

	it('turns back on for a single unsold Bleep', () => {
		const owners = allMinted();
		owners[123] = ZERO;
		expect(bleepsMode({owners, saleDeployed: true})).toEqual('mint');
		expect(idsForSale(owners)).toEqual([123]);
	});
});

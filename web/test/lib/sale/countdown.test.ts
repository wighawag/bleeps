import {describe, expect, it} from 'vitest';
import {saleCountdown, time2text} from '$lib/sale/countdown';

describe('time2text', () => {
	// The pre-template site's wording, kept as it was
	it('counts in seconds up to two minutes', () => {
		expect(time2text(45)).toEqual('45 seconds');
		expect(time2text(119)).toEqual('119 seconds');
	});

	it('counts in minutes and seconds up to two hours', () => {
		expect(time2text(120)).toEqual('2 minutes and 0 seconds');
		expect(time2text(3661)).toEqual('61 minutes and 1 seconds');
	});

	it('counts in hours and minutes beyond that', () => {
		expect(time2text(7200)).toEqual('2 hours and 0 minutes');
		expect(time2text(9000)).toEqual('2 hours and 30 minutes');
	});
});

describe('saleCountdown', () => {
	const startTime = 1_000_000;
	const publicSaleTimestamp = startTime + 3600;

	it('counts down to the private sale opening', () => {
		expect(
			saleCountdown({
				startTime,
				publicSaleTimestamp,
				nowSeconds: startTime - 90,
			}),
		).toEqual({phase: 'not-started', opensIn: '90 seconds'});
	});

	it('counts down the private sale once it is open', () => {
		expect(
			saleCountdown({
				startTime,
				publicSaleTimestamp,
				nowSeconds: startTime + 3540,
			}),
		).toEqual({phase: 'whitelist', timeLeft: '60 seconds'});
	});

	it('says the public sale is on once the pass requirement lapses', () => {
		expect(
			saleCountdown({
				startTime,
				publicSaleTimestamp,
				nowSeconds: publicSaleTimestamp,
			}),
		).toEqual({phase: 'public'});
	});
});

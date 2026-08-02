import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
	BookingRefusedError,
	bookedBleeps,
	createBookingClient,
	isBookingLive,
	type Booking,
} from '$lib/sale/booking';

const NOW = 1_000_000;

function booking(overrides: Partial<Booking> = {}): Booking {
	return {
		address: '0x1111111111111111111111111111111111111111',
		bleep: 7,
		timestamp: NOW,
		...overrides,
	};
}

describe('isBookingLive', () => {
	it('holds a fresh booking that has no transaction yet', () => {
		expect(isBookingLive(booking(), NOW + 5)).toBe(true);
	});

	it('lets one go once its ten seconds are up', () => {
		// the service defends a booking for 10s, so the app must not claim longer
		expect(isBookingLive(booking(), NOW + 11)).toBe(false);
	});

	it('holds one that has a transaction, however old', () => {
		expect(
			isBookingLive(
				booking({transaction: {hash: '0xabc', confirmed: 0}}),
				NOW + 10_000,
			),
		).toBe(true);
	});
});

describe('bookedBleeps', () => {
	it('is the set somebody else is already paying for', () => {
		const booked = bookedBleeps(
			[
				booking({bleep: 1}),
				booking({bleep: 2, timestamp: NOW - 60}),
				booking({
					bleep: 3,
					timestamp: NOW - 60,
					transaction: {hash: '0xabc', confirmed: 0},
				}),
			],
			NOW,
		);
		expect([...booked].sort()).toEqual([1, 3]);
	});
});

describe('createBookingClient', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('is absent when no service is configured, and the app goes on without it', () => {
		expect(createBookingClient(undefined)).toBeUndefined();
		expect(createBookingClient('')).toBeUndefined();
	});

	it('posts a booking', async () => {
		fetchMock.mockResolvedValue({json: async () => ({success: true})});
		const client = createBookingClient('http://booking.test/');
		await client!.book({address: '0x1', bleep: 4});

		expect(fetchMock).toHaveBeenCalledWith(
			'http://booking.test/book',
			expect.objectContaining({method: 'POST'}),
		);
	});

	it('raises a refusal as its own error, because that one has to stop a mint', async () => {
		fetchMock.mockResolvedValue({
			json: async () => ({success: false, message: 'bleep is already booked'}),
		});
		const client = createBookingClient('http://booking.test');

		await expect(
			client!.book({address: '0x1', bleep: 4}),
		).rejects.toBeInstanceOf(BookingRefusedError);
	});
});

import type {Readable} from 'svelte/store';
import {
	createPollingStore,
	type PollingStore,
} from '$lib/core/connection/polling-store';

/**
 * The booking service: purchase intents, so two people do not spend gas on the
 * same Bleep.
 *
 * It is advisory and always has been. Nothing on chain knows about a booking:
 * the sale is first transaction wins, and the service only makes it less likely
 * that two people race for the same one. So every call here is allowed to fail
 * without stopping a mint, and the app works (slightly worse) with no service
 * configured at all, which is what an empty PUBLIC_BOOKING_SERVICE_URL means.
 *
 * Dev-only, like the sale itself: mainnet is sold out, so there is nothing left
 * to book. See docs/adr/0001-dev-only-sale-and-distribution.md.
 */

/**
 * The service refusing a booking: somebody else has that Bleep, or this address
 * or pass already has one in flight.
 *
 * Distinguished from a network failure on purpose. A refusal is information and
 * should stop the mint; an unreachable service is not, and must not, because the
 * booking is advisory and the sale itself does not care.
 */
export class BookingRefusedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookingRefusedError';
	}
}

export type Booking = {
	address: string;
	bleep: number;
	transaction?: {hash: string; confirmed: number};
	passId?: number;
	timestamp: number;
};

export type BookingSubmission = {
	address: string;
	bleep: number;
	transactionHash?: string;
	pass?: {id: number; to: string; signature: string};
};

export type BookingsValue = {bookings: Booking[]};
export type BookingsStore = PollingStore<BookingsValue>;

export type BookingClient = {
	/**
	 * Advertise an intent to buy. Throws with the service's own message when it
	 * refuses (someone else booked it, too many bookings from this address, a
	 * pass already in use), which the caller shows and stops on.
	 */
	book(submission: BookingSubmission): Promise<void>;
	/** Current bookings, polled. */
	bookings: BookingsStore;
};

/**
 * How long a booking without a transaction is honoured, in seconds.
 *
 * The service uses 10s (`Bookings.book`), so the app must not draw a tile as
 * booked for longer than the service would defend it.
 */
export const BOOKING_TTL_SECONDS = 10;

/** Whether a booking should still keep others off that Bleep. */
export function isBookingLive(booking: Booking, nowSeconds: number): boolean {
	return (
		!!booking.transaction?.hash ||
		nowSeconds < booking.timestamp + BOOKING_TTL_SECONDS
	);
}

/** The Bleeps currently spoken for, by anybody. */
export function bookedBleeps(
	bookings: readonly Booking[],
	nowSeconds: number,
): Set<number> {
	const booked = new Set<number>();
	for (const booking of bookings) {
		if (isBookingLive(booking, nowSeconds)) {
			booked.add(booking.bleep);
		}
	}
	return booked;
}

export function createBookingClient(
	url: string | undefined,
	/**
	 * Gate for the polling. Bookings only matter while there is a sale to run, so
	 * a browse-mode page (mainnet, or a dev chain that sold out) must not sit
	 * there polling a service about Bleeps nobody can buy.
	 */
	enabled?: Readable<boolean>,
): BookingClient | undefined {
	if (!url) {
		return undefined;
	}
	const endpoint = url.replace(/\/$/, '');

	return {
		async book(submission: BookingSubmission): Promise<void> {
			const response = await fetch(`${endpoint}/book`, {
				method: 'POST',
				body: JSON.stringify(submission),
			});
			const result = await response.json();
			if (!result.success) {
				throw new BookingRefusedError(
					result.message ?? 'that Bleep is spoken for',
				);
			}
		},
		bookings: createPollingStore<BookingsValue, boolean>(
			async () => {
				const response = await fetch(`${endpoint}/list`, {method: 'GET'});
				const result = await response.json();
				return {bookings: (result.list ?? []) as Booking[]};
			},
			{
				// A booking lasts 10s, so a slower poll than this would show tiles as
				// free that somebody is already paying for.
				fetchInterval: 2_000,
				...(enabled ? {source: {store: enabled}} : {}),
			},
		),
	};
}

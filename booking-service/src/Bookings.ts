import {createPublicClient, http, recoverMessageAddress, type PublicClient} from 'viem';
import type {Env} from './types';
import {contracts, chainId} from './contracts.json';
import {DO} from './DO';
import {errorResponse, NotAuthorized} from './errors';
import {createResponse} from './utils';

const numPrivatePasses = contracts.BleepsInitialSale.linkedData.numPrivatePasses;
const leaves = contracts.BleepsInitialSale.linkedData.leaves;

let defaultFinality = 12;
if (chainId === '1337') {
	defaultFinality = 3;
} else if (chainId === '31337') {
	defaultFinality = 2;
}

type BookingSubmission = {
	address: string;
	transactionHash?: string;
	pass?: {
		id: number;
		to: string;
		signature: string;
	};
	bleep: number;
};

type Booking = {
	address: string;
	ip: string;
	bleep: number;
	transaction?: {hash: string; confirmed: number};
	passId?: number;
	timestamp: number;
};

type BookingList = {
	list: Booking[];
	counter: number;
};

/**
 * The passphrase that must appear in the path to wipe all bookings.
 *
 * A shared secret in the source is weak, but this is a dev-only service holding
 * throwaway purchase intents, and it is a great deal stronger than the previous
 * arrangement, which was no check at all.
 */
const ADMIN_SECRET = 'fall-sunshine-autumn-tree';

// needed because of : https://github.com/cloudflare/durable-objects-typescript-rollup-esm/issues/3
type State = DurableObjectState & {blockConcurrencyWhile: (func: () => Promise<void>) => void};

function getTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

export class Bookings extends DO {
	client: PublicClient;
	finality: number;

	constructor(state: State, env: Env) {
		super(state, env);
		this.client = createPublicClient({transport: http(env.ETHEREUM_NODE)});
		this.finality = env.FINALITY ? parseInt(env.FINALITY) : defaultFinality;
	}

	async book(path: string[], bookingSubmission: BookingSubmission): Promise<Response> {
		if (bookingSubmission.bleep >= 576) {
			return errorResponse({code: 4111, message: 'invalid bleep'});
		}

		const timestamp = getTimestamp();
		const publicSale = timestamp > contracts.BleepsInitialSale.linkedData.publicSaleTimestamp; // TODO

		if (!publicSale) {
			if (!bookingSubmission.pass) {
				return errorResponse({code: 4001, message: 'need pass'});
			}
			const pass = bookingSubmission.pass;
			// TODO
			if (pass.id < numPrivatePasses) {
				const signer = await recoverMessageAddress({
					message: `${bookingSubmission.bleep}`,
					signature: pass.signature as `0x${string}`,
				});
				const leaf = leaves.find((v) => v.passId === '' + pass.id);
				if (!leaf) {
					return errorResponse({code: 4222, message: 'invalid pass'});
				}
				if (leaf.signer.toLowerCase() !== signer.toLowerCase()) {
					return errorResponse({code: 4222, message: 'not authorzed pass'});
				}
			} else {
				// TODO mandalas ?
			}
		}

		// absent when not running behind Cloudflare, which is the case under `wrangler dev`
		const ip = this.currentRequest?.headers.get('CF-Connecting-IP') ?? '';

		// this.info(`ip: ${ip}`);

		let list = await this.state.storage.get<BookingList>('_bookings');
		if (!list) {
			list = {list: [], counter: 0};
		}
		const currentBooking = list.list.find(
			(v) => v.bleep == bookingSubmission.bleep && (v.transaction || timestamp - v.timestamp < 10),
		);
		if (currentBooking) {
			if (!currentBooking.transaction) {
				if (timestamp < currentBooking.timestamp + 10 && currentBooking.address !== bookingSubmission.address) {
					return createResponse({success: false, message: 'bleep is already booked'});
				}
				currentBooking.address = bookingSubmission.address;
				currentBooking.ip = ip;
				currentBooking.passId = bookingSubmission.pass?.id;
				currentBooking.timestamp = timestamp;
				currentBooking.transaction = bookingSubmission.transactionHash
					? {hash: bookingSubmission.transactionHash, confirmed: 0}
					: undefined;
			} else {
				return createResponse({success: false, message: 'bleep is already being purchased...'});
			}
		} else {
			let available = true;

			const currentBookingsWithIP = list.list.filter(
				(v) => v.ip == ip && (v.transaction || timestamp - v.timestamp < 10),
			);
			this.info(` ${currentBookingsWithIP.map((v) => v.bleep).join(',')}`);
			if (currentBookingsWithIP.length < 3) {
				available = true;
			} else {
				available = false;
				return createResponse({success: false, message: 'too many bookings, wait for your tx to settle.'});
			}

			if (!publicSale) {
				const currentBookingWithPassId = list.list.find(
					(v) =>
						(v.transaction || timestamp - v.timestamp < 10) &&
						v.passId !== undefined &&
						v.passId == bookingSubmission.pass?.id,
				);
				if (currentBookingWithPassId) {
					available = false;
					return createResponse({success: false, message: 'your other booking is pending, wait 10s'});
				} else {
					available = true;
				}
			}

			if (available) {
				list.list.push({
					address: bookingSubmission.address,
					bleep: bookingSubmission.bleep,
					timestamp,
					passId: bookingSubmission.pass?.id,
					transaction: bookingSubmission.transactionHash
						? {hash: bookingSubmission.transactionHash, confirmed: 0}
						: undefined,
					ip,
				});
			}
		}
		list.counter++;
		await this.state.storage.put<BookingList>('_bookings', list);
		return createResponse({success: true});
	}

	async list(path: string[]): Promise<Response> {
		let list = await this.state.storage.get<BookingList>('_bookings');
		if (!list) {
			list = {list: [], counter: 0};
		}
		return createResponse({success: true, list: list.list});
	}

	async deleteAll(path: string[]): Promise<Response> {
		// This used to wipe storage on BOTH branches and only differ in the success
		// flag it reported, so the passphrase guarded nothing: any caller could erase
		// every booking. `isAuthorized` and `NotAuthorized` below were clearly
		// written for this and never wired up.
		if (path[0] !== ADMIN_SECRET) {
			return NotAuthorized();
		}
		await this.state.storage.deleteAll();
		return createResponse({success: true});
	}

	async checkTransactions(path: string[]): Promise<Response> {
		const timestamp = getTimestamp();

		let list = await this.state.storage.get<BookingList>('_bookings');
		if (!list) {
			list = {list: [], counter: 0};
		}
		const transactions: {hash: string; timestamp: number}[] = [];
		for (const booking of list.list) {
			if (booking.transaction) {
				transactions.push({hash: booking.transaction.hash, timestamp: booking.timestamp});
			}
		}

		const transactionsToDelete: string[] = [];
		// const transactionsToUpdate: {hash: string; confirmations: number}[] = [];

		for (const transaction of transactions) {
			const hash = transaction.hash as `0x${string}`;
			// viem throws rather than returning null for an unknown transaction, and
			// "we have not seen it yet" is a normal state here, not an error.
			const transactionFromPeers = await this.client.getTransaction({hash}).catch(() => undefined);
			if (transactionFromPeers) {
				if (transactionFromPeers.to?.toLocaleLowerCase() !== contracts.BleepsInitialSale.address.toLowerCase()) {
					this.info(`invalid tx : ${transaction.hash}`);
					transactionsToDelete.push(transaction.hash);
				} else if (transactionFromPeers.blockNumber !== null) {
					const receipt = await this.client.getTransactionReceipt({hash});
					const confirmations = Number(await this.client.getTransactionConfirmations({hash}));
					this.info({status: receipt.status, hash: transaction.hash, confirmations});
					if (receipt.status === 'reverted') {
						this.info(`tx failed : ${transaction.hash}`);
						transactionsToDelete.push(transaction.hash);
					} else {
						if (confirmations > 6) {
							this.info(`tx finalized : ${transaction.hash}`);
							transactionsToDelete.push(transaction.hash);
						} else {
							// transactionsToUpdate.push({hash: transaction.hash, confirmations});
						}
					}
				} else {
					if (timestamp > transaction.timestamp + 60) {
						this.info(`pending for ${timestamp - transaction.timestamp} seconds : ${transaction.hash}`);
						// transactionsToDelete.push(transaction.hash);
					}
				}
			} else {
				if (timestamp > transaction.timestamp + 60) {
					this.info(`cannot find after ${timestamp - transaction.timestamp} seconds : ${transaction.hash}`);
					transactionsToDelete.push(transaction.hash);
				}
			}
		}

		if (transactionsToDelete.length > 0) {
			const listRefetched = await this.state.storage.get<BookingList>('_bookings');
			if (!listRefetched) {
				// nothing left to prune: the list was cleared while we were checking
				return createResponse({success: true});
			}

			const bookingsToDelete = [];
			for (const booking of listRefetched.list) {
				if (!booking.transaction && booking.timestamp < timestamp - 60) {
					bookingsToDelete.push(booking.bleep);
				}
			}

			for (const bk of bookingsToDelete) {
				this.info(`deleting : booking for ${bk} as it is there for 60 seconds...`);
				listRefetched.list = listRefetched.list.filter((v) => v.bleep !== bk);
			}

			this.info(`list length ${listRefetched.list.length}`);
			for (const hash of transactionsToDelete) {
				this.info(`deleting : ${hash}...`);
				listRefetched.list = listRefetched.list.filter((v) => !v.transaction || v.transaction.hash !== hash);
			}
			// listRefetched.list = listRefetched.list.filter(
			//   (v) => !v.transaction || !transactionsToDelete.find((d) => d === v.transaction.hash)
			// );

			this.info(`new list length ${listRefetched.list.length}`);

			listRefetched.counter++;
			await this.state.storage.put('_bookings', listRefetched);
		}

		return createResponse({success: true});
	}
}

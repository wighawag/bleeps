import {writable, get} from 'svelte/store';
import {scanLatestTransactions} from '../services/blockScanner';
import type {TransactionSummary} from '../services/blockScanner';
import type {PublicClient, Transaction} from 'viem';

/**
 * Detailed transaction with timestamp
 */
export interface DetailedTransaction {
	tx: Transaction;
	blockTimestamp: number;
}

/**
 * Transaction list store state
 */
export interface TransactionListState {
	transactions: TransactionSummary[];
	detailedTransactions: DetailedTransaction[];
	loading: boolean;
	loadingDetails: boolean;
	error: string | null;
	lastBlockNumber: bigint | null;
}

const initialState: TransactionListState = {
	transactions: [],
	detailedTransactions: [],
	loading: false,
	loadingDetails: false,
	error: null,
	lastBlockNumber: null,
};

/**
 * Options for creating a transaction list store
 */
export interface TransactionListStoreOptions {
	publicClient: PublicClient;
	useBlockIndex?: boolean;
}

/**
 * Create a transaction list store
 * @param options - Configuration options for the store including publicClient
 */
export function createTransactionListStore(
	options: TransactionListStoreOptions,
) {
	const {publicClient, useBlockIndex = false} = options;
	const {subscribe, set, update} = writable<TransactionListState>(initialState);

	// Track fetched transaction hashes to avoid re-fetching
	const fetchedHashes = new Set<string>();

	/**
	 * Fetch latest transactions from the blockchain
	 */
	async function fetchTransactions(targetCount: number = 20): Promise<void> {
		update((state) => ({...state, loading: true, error: null}));

		try {
			const txs = await scanLatestTransactions(
				publicClient,
				targetCount,
				5, // batchSize
				100, // maxBlocksToScan
				useBlockIndex,
			);

			update((state) => ({
				...state,
				transactions: txs,
				lastBlockNumber:
					txs.length > 0 ? txs[0].blockNumber : state.lastBlockNumber,
				loading: false,
			}));

			// After fetching summaries, fetch detailed transactions
			await fetchDetailedTransactions(txs);
		} catch (e: unknown) {
			const error = e as Error;
			console.error('Error fetching transactions:', e);
			update((state) => ({
				...state,
				error: error.message || 'Failed to fetch transactions',
				loading: false,
			}));
		}
	}

	/**
	 * Fetch detailed transaction objects for the given summaries
	 */
	async function fetchDetailedTransactions(
		summaries: TransactionSummary[],
	): Promise<void> {
		if (summaries.length === 0) {
			update((state) => ({
				...state,
				detailedTransactions: [],
				loadingDetails: false,
			}));
			return;
		}

		// Filter to only new transactions we haven't fetched yet
		const newSummaries = summaries.filter((s) => !fetchedHashes.has(s.hash));

		if (newSummaries.length === 0) {
			// All transactions already fetched, just reorder if needed
			const currentState = get({subscribe});
			const txMap = new Map(
				currentState.detailedTransactions.map((d) => [d.tx.hash, d]),
			);
			const reordered: DetailedTransaction[] = [];
			for (const s of summaries) {
				const tx = txMap.get(s.hash as `0x${string}`);
				if (tx) {
					reordered.push(tx);
				}
			}
			update((state) => ({...state, detailedTransactions: reordered}));
			return;
		}

		update((state) => ({...state, loadingDetails: true}));

		try {
			const detailed = await Promise.all(
				newSummaries.map(async (summary) => {
					try {
						const tx = await publicClient.getTransaction({
							hash: summary.hash as `0x${string}`,
						});
						return {
							tx,
							blockTimestamp: summary.timestamp,
						} as DetailedTransaction;
					} catch (e) {
						console.error('Error fetching transaction details:', e);
						return null;
					}
				}),
			);

			// Filter out null values
			const validDetailed: DetailedTransaction[] = [];
			for (const t of detailed) {
				if (t !== null) {
					validDetailed.push(t);
				}
			}

			// Update the fetched hashes set
			for (const item of validDetailed) {
				fetchedHashes.add(item.tx.hash);
			}

			// Merge with existing detailed transactions
			const currentState = get({subscribe});
			const existingMap = new Map<`0x${string}`, DetailedTransaction>(
				currentState.detailedTransactions.map((d) => [d.tx.hash, d]),
			);
			for (const item of validDetailed) {
				existingMap.set(item.tx.hash, item);
			}

			// Rebuild in order of summaries
			const orderedDetailed: DetailedTransaction[] = [];
			for (const summary of summaries) {
				const tx = existingMap.get(summary.hash as `0x${string}`);
				if (tx) {
					orderedDetailed.push(tx);
				}
			}

			update((state) => ({
				...state,
				detailedTransactions: orderedDetailed,
				loadingDetails: false,
			}));
		} catch (e) {
			console.error('Error fetching detailed transactions:', e);
			update((state) => ({...state, loadingDetails: false}));
		}
	}

	/**
	 * Refresh transactions (refetch from blockchain)
	 */
	async function refresh(): Promise<void> {
		const state = get({subscribe});
		// Clear the fetched hashes to force re-fetch
		fetchedHashes.clear();
		await fetchTransactions(
			state.transactions.length > 0 ? state.transactions.length : 20,
		);
	}

	/**
	 * Reset the store to initial state
	 */
	function reset(): void {
		fetchedHashes.clear();
		set(initialState);
	}

	return {
		subscribe,
		fetchTransactions,
		refresh,
		reset,
	};
}

/**
 * Store instances keyed by publicClient to allow multiple instances
 */
const storeInstances = new WeakMap<
	PublicClient,
	ReturnType<typeof createTransactionListStore>
>();

/**
 * Get or create a transaction list store for the given publicClient
 * @param options - Configuration options for the store
 */
export function getTransactionListStore(options: TransactionListStoreOptions) {
	const {publicClient} = options;

	let store = storeInstances.get(publicClient);
	if (!store) {
		store = createTransactionListStore(options);
		storeInstances.set(publicClient, store);
	}
	return store;
}

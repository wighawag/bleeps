import type {TrackedWalletClientType} from '@etherkit/viem-tx-tracker';
import type {
	ExtendedTransactionMetadata,
	MultiAccountDataStore,
	TransactionMetadata,
} from './AccountData';
import type {TransactionObserver} from '@etherkit/tx-observer';
import {hookTxObserverToAccountData} from '$lib/core/utils/data/synqable-transactions';
import type {OnchainStateStore} from '$lib/onchain/state';
import type {ExecutorStore} from '$lib/core/connection/executor';
import {createConnector, combineTeardowns} from './connector';

type TrackedClient = TrackedWalletClientType<TransactionMetadata, true>;

/**
 * The only surface this connector needs from a tracked client: its event
 * subscription. Both the wallet-mode client and any signer-mode client satisfy
 * this regardless of their transport/chain generics (which `on` does not
 * mention), so no casting is needed to attach to either.
 */
type TrackedTxSource = Pick<TrackedClient, 'on'>;

/**
 * Attach the broadcast/fetched listeners that feed tracked transactions into
 * Account Data. Returns a teardown. Reused for both the wallet-mode client and
 * any signer-mode client the executor builds.
 */
function attachTrackedClient(
	walletClient: TrackedTxSource,
	accountData: MultiAccountDataStore,
): () => void {
	return combineTeardowns([
		walletClient.on('transaction:broadcasted', (tx) => {
			// Check if this is a resubmit (has operationId in metadata)
			const metadata = tx.metadata as ExtendedTransactionMetadata;
			if (metadata.operationId) {
				// Add transaction to existing operation
				accountData.addTransactionToOperation(metadata.operationId, tx);
			} else {
				// Create new operation
				accountData.addOperationFromTrackedTransaction(tx);
			}
		}),
		// if needed we can also update on getting the full tx data
		walletClient.on('transaction:fetched', (tx) => {
			accountData.updateOperationFromFetchedTransaction(tx);
		}),
	]);
}

/// Listen for broadcasted transactions and save them in the Account Data.
///
/// Attaches to the always-present wallet-mode client, and, so signer-mode
/// transactions are tracked identically, to the signer client the executor
/// exposes in signer mode. At most ONE signer client is attached at a time:
/// when the executor exposes a different client (re-sign-in as a different
/// identity derives a different key, hence a new client), the previous
/// client's listeners are detached first. This is a correctness requirement,
/// not just hygiene: `accountData` follows the CURRENT account, so a stale
/// client's late events would be looked up in (or worse, written into) the
/// wrong account's data.
export function createTrackedWalletConnector(params: {
	walletClient: TrackedTxSource;
	executor: ExecutorStore;
	accountData: MultiAccountDataStore;
}) {
	const {accountData, walletClient, executor} = params;

	return createConnector(() => {
		// Wallet-mode client: one instance for the app's lifetime, always attached
		// (in wallet mode the sender is always the current account, so its events
		// always belong to the current account's data).
		const walletTeardown = attachTrackedClient(walletClient, accountData);

		let signerClient: TrackedTxSource | undefined;
		let signerTeardown: (() => void) | undefined;

		const unsubscribe = executor.subscribe(($executor) => {
			// Transient not-ready states (reconnection steps) keep the current
			// attachment: detaching would drop follow-up events (e.g.
			// transaction:fetched) for a same-account reconnect. Only an actual
			// REPLACEMENT client (a different identity) triggers a swap.
			if ($executor.status !== 'ready') return;
			const client = $executor.client;
			// In wallet mode the executor's client IS the wallet-mode client, which
			// is already attached above; attaching again would double-record every
			// transaction.
			if (client === walletClient || client === signerClient) return;
			signerTeardown?.();
			signerClient = client;
			signerTeardown = attachTrackedClient(client, accountData);
		});

		return () => {
			unsubscribe();
			signerTeardown?.();
			walletTeardown();
		};
	});
}

/// Listen for Account Data transaction being added/removed
///  Notify the transaction observer
///  And in turn save any update from the observer
export function createTransactionObserverConnector(params: {
	txObserver: TransactionObserver;
	accountData: MultiAccountDataStore;
}) {
	const {accountData, txObserver} = params;

	return createConnector(() =>
		combineTeardowns([
			txObserver.on('intent:status', (event) =>
				accountData.updateOperationFromTransactionStateUpdated(event),
			),
			hookTxObserverToAccountData({
				accountData,
				mapKey: 'operations',
				extractValue: (item) => item.transactionIntent,
				observer: txObserver,
			}),
		]),
	);
}

/// Listen for tx observer events and refresh onchain state when transactions are included
export function createOnchainStateRefreshConnector(params: {
	txObserver: TransactionObserver;
	onchainState: OnchainStateStore;
}) {
	const {txObserver, onchainState} = params;

	return createConnector(() =>
		txObserver.on('intent:status', (event) => {
			// Refresh onchain state when a transaction is included
			if (event.intent.state?.inclusion === 'Included') {
				onchainState.update();
			}
		}),
	);
}

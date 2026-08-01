import {describe, it, expect} from 'vitest';
import {writable} from 'svelte/store';
import {createTrackedWalletConnector} from '../../../src/lib/account/connectors';

/**
 * Fake tracked client exposing only `on` (the surface the connector uses),
 * with introspection for how many listeners are currently attached and the
 * ability to emit events to them.
 */
function makeFakeClient() {
	const listeners = new Map<string, Set<(data: unknown) => void>>();
	return {
		on(event: string, listener: (data: unknown) => void) {
			let set = listeners.get(event);
			if (!set) {
				set = new Set();
				listeners.set(event, set);
			}
			set.add(listener);
			return () => set!.delete(listener);
		},
		emit(event: string, data: unknown) {
			for (const listener of listeners.get(event) ?? []) listener(data);
		},
		listenerCount(event: string) {
			return listeners.get(event)?.size ?? 0;
		},
	};
}

/** Records which transactions reached account data (the connector's sink). */
function makeFakeAccountData() {
	const added: unknown[] = [];
	return {
		added,
		accountData: {
			addOperationFromTrackedTransaction: (tx: unknown) => added.push(tx),
			addTransactionToOperation: (_id: string, tx: unknown) => added.push(tx),
			updateOperationFromFetchedTransaction: () => {},
		} as never,
	};
}

function setup(executorInitial: unknown) {
	const walletClient = makeFakeClient();
	const executor = writable(executorInitial);
	const {added, accountData} = makeFakeAccountData();
	const connector = createTrackedWalletConnector({
		walletClient: walletClient as never,
		executor: executor as never,
		accountData,
	});
	return {walletClient, executor, connector, added};
}

const tx = (hash: string) => ({hash, metadata: {}});

describe('createTrackedWalletConnector', () => {
	it('attaches the wallet client and records its broadcasts', () => {
		const {walletClient, connector, added} = setup({status: 'not-connected'});
		connector.connect();
		expect(walletClient.listenerCount('transaction:broadcasted')).toBe(1);
		walletClient.emit('transaction:broadcasted', tx('0x01'));
		expect(added).toHaveLength(1);
		connector.disconnect();
		expect(walletClient.listenerCount('transaction:broadcasted')).toBe(0);
	});

	it('does not double-attach when the executor exposes the wallet client (wallet mode)', () => {
		const walletClient = makeFakeClient();
		const executor = writable({
			status: 'ready',
			address: '0x1',
			account: '0x1',
			client: walletClient,
		});
		const {added, accountData} = makeFakeAccountData();
		const connector = createTrackedWalletConnector({
			walletClient: walletClient as never,
			executor: executor as never,
			accountData,
		});
		connector.connect();
		expect(walletClient.listenerCount('transaction:broadcasted')).toBe(1);
		walletClient.emit('transaction:broadcasted', tx('0x01'));
		expect(added).toHaveLength(1); // recorded once, not twice
		connector.disconnect();
	});

	it('detaches the previous signer client when a new one replaces it', () => {
		const signerA = makeFakeClient();
		const signerB = makeFakeClient();
		const {walletClient, executor, connector, added} = setup({
			status: 'ready',
			address: '0xa',
			account: '0xa',
			client: signerA,
		});
		connector.connect();
		expect(signerA.listenerCount('transaction:broadcasted')).toBe(1);

		// Re-sign-in as a different identity: executor exposes a NEW client.
		executor.set({
			status: 'ready',
			address: '0xb',
			account: '0xb',
			client: signerB,
		});
		expect(signerA.listenerCount('transaction:broadcasted')).toBe(0);
		expect(signerB.listenerCount('transaction:broadcasted')).toBe(1);

		// A late event from the stale client must NOT reach account data.
		signerA.emit('transaction:broadcasted', tx('0xdead'));
		expect(added).toHaveLength(0);
		signerB.emit('transaction:broadcasted', tx('0x02'));
		expect(added).toHaveLength(1);

		connector.disconnect();
		expect(signerB.listenerCount('transaction:broadcasted')).toBe(0);
		expect(walletClient.listenerCount('transaction:broadcasted')).toBe(0);
	});

	it('keeps the signer attachment across transient not-ready states', () => {
		const signerA = makeFakeClient();
		const {executor, connector} = setup({
			status: 'ready',
			address: '0xa',
			account: '0xa',
			client: signerA,
		});
		connector.connect();
		expect(signerA.listenerCount('transaction:broadcasted')).toBe(1);

		// Mid-reconnect blip: same identity will come back.
		executor.set({status: 'not-connected'});
		expect(signerA.listenerCount('transaction:broadcasted')).toBe(1);
		executor.set({
			status: 'ready',
			address: '0xa',
			account: '0xa',
			client: signerA,
		});
		expect(signerA.listenerCount('transaction:broadcasted')).toBe(1); // still exactly one

		connector.disconnect();
	});
});

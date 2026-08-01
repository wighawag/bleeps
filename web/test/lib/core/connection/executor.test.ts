import {describe, it, expect} from 'vitest';
import {get, writable} from 'svelte/store';
import {privateKeyToAccount} from 'viem/accounts';
import {createExecutor} from '../../../../src/lib/core/connection/executor';

// Well-known dev private key (hardhat/anvil account 0); fine for tests.
const DEV_KEY =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
const DEV_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const OWNER = '0x1111111111111111111111111111111111111111' as `0x${string}`;

/** Minimal connection-store stand-in; only `subscribe` is read. */
function makeConnection(initial: unknown) {
	const store = writable(initial);
	return {
		store,
		connection: {
			subscribe: store.subscribe,
		} as never,
	};
}

const walletClient = {tag: 'wallet-client'} as never;
const trackedSignerClient = {tag: 'signer-client'} as never;

function makeExecutor(
	initialState: unknown,
	executionMode: 'wallet' | 'signer',
) {
	const {store, connection} = makeConnection(initialState);
	let buildCount = 0;
	const executor = createExecutor({
		connection,
		walletClient,
		executionMode,
		buildSignerClient: (privateKey) => {
			buildCount++;
			return {
				client: trackedSignerClient,
				account: privateKeyToAccount(privateKey),
			};
		},
	});
	return {executor, store, getBuildCount: () => buildCount};
}

describe('createExecutor state derivation', () => {
	it('is not-connected when there is no account', () => {
		const {executor} = makeExecutor({step: 'Idle', wallets: []}, 'wallet');
		expect(get(executor)).toEqual({status: 'not-connected'});
	});

	describe('wallet execution mode', () => {
		it('is ready with the wallet account when a wallet is connected', () => {
			const {executor} = makeExecutor(
				{
					step: 'WalletConnected',
					account: {address: OWNER},
					wallet: {accounts: [OWNER]},
					wallets: [],
				},
				'wallet',
			);
			const state = get(executor);
			expect(state.status).toBe('ready');
			if (state.status === 'ready') {
				expect(state.address).toBe(OWNER);
				// wallet mode: account is the address string (JSON-RPC account)
				expect(state.account).toBe(OWNER);
				expect(state.client).toBe(walletClient);
			}
		});

		it('is cannot-send for an account without a wallet (email/social)', () => {
			const {executor} = makeExecutor(
				{
					step: 'SignedIn',
					account: {
						address: OWNER,
						signer: {address: DEV_ADDRESS, privateKey: DEV_KEY},
					},
					wallet: undefined,
					wallets: [],
				},
				'wallet',
			);
			expect(get(executor)).toEqual({status: 'cannot-send'});
		});
	});

	describe('signer execution mode', () => {
		it('is ready with the local signer when SignedIn (even via wallet)', () => {
			const {executor} = makeExecutor(
				{
					step: 'SignedIn',
					account: {
						address: OWNER,
						signer: {address: DEV_ADDRESS, privateKey: DEV_KEY},
					},
					wallet: {accounts: [OWNER]},
					wallets: [],
				},
				'signer',
			);
			const state = get(executor);
			expect(state.status).toBe('ready');
			if (state.status === 'ready') {
				expect(state.address).toBe(DEV_ADDRESS);
				// signer mode: account is a viem Local Account object, not a string
				expect(typeof state.account).toBe('object');
				expect((state.account as {address: string}).address).toBe(DEV_ADDRESS);
				expect((state.account as {type: string}).type).toBe('local');
				expect(state.client).toBe(trackedSignerClient);
			}
		});

		it('is not-connected before the sign-in signature exists', () => {
			const {executor} = makeExecutor(
				{
					step: 'WalletConnected',
					account: {address: OWNER},
					wallet: {accounts: [OWNER]},
					wallets: [],
				},
				'signer',
			);
			expect(get(executor)).toEqual({status: 'not-connected'});
		});

		it('caches the signer client across emissions for the same key', () => {
			const signedIn = {
				step: 'SignedIn',
				account: {
					address: OWNER,
					signer: {address: DEV_ADDRESS, privateKey: DEV_KEY},
				},
				wallet: undefined,
				wallets: [],
			};
			const {executor, store, getBuildCount} = makeExecutor(signedIn, 'signer');
			const first = get(executor);
			store.set({...signedIn});
			const second = get(executor);
			if (first.status === 'ready' && second.status === 'ready') {
				expect(first.client).toBe(second.client);
				expect(first.account).toBe(second.account);
				expect(getBuildCount()).toBe(1);
			} else {
				throw new Error('expected ready states');
			}
		});
	});
});

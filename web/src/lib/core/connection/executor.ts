import {derived, type Readable} from 'svelte/store';
import type {Account, Transport} from 'viem';
import type {TrackedWalletClientAutoPopulate} from '@etherkit/viem-tx-tracker';
import type {TransactionMetadata} from '$lib/account/AccountData';
import type {ExecutionMode} from './mode';
import type {ChainConnection, ChainInfo} from './types';

/**
 * The transaction executor.
 *
 * A single, mode-agnostic front for sending transactions. Call sites use it
 * instead of reaching into the connection + wallet client directly, so they do
 * not have to know whether the app sends from the connected wallet account or
 * from a local signer.
 *
 * The executor's `client` is a real tracked viem wallet client, so all viem
 * type inference (abitype-driven `functionName`/`args`, typed returns) and the
 * tx-tracker metadata still apply at the call site. Only the underlying
 * transport/account differ between modes, which is invisible to the types.
 *
 * Two execution modes (see ./mode):
 * - `wallet`: send from the connected wallet account via the connection
 *   provider. An account with no wallet (email/social sign-in) resolves to
 *   `cannot-send`.
 * - `signer`: send from the local signer (a private key derived at sign-in),
 *   using the client built by the caller-supplied {@link SignerClientFactory}
 *   (typically broadcasting over the node RPC). Works for every account
 *   (including wallet-authenticated ones).
 */

/**
 * The executor's tracked wallet client.
 *
 * Same shape the rest of the app uses (`context.walletClient`), but generic
 * over the transport: the wallet-mode client rides the connection provider
 * (`custom` transport) while a signer-mode client typically uses `http`. The
 * chain stays pinned to the app's `ChainInfo`, so viem's
 * `writeContract`/`sendTransaction` generics (abitype inference, optional
 * `chain`) apply unchanged at call sites.
 */
export type ExecutorClient = TrackedWalletClientAutoPopulate<
	TransactionMetadata,
	Transport,
	ChainInfo,
	Account | undefined
>;

export type ExecutorState =
	/** No account connected yet: nothing can be sent. */
	| {status: 'not-connected'}
	/**
	 * Ready to send.
	 * - `address`: the `from` address (for display, balance, gas estimation).
	 * - `account`: what to pass to `writeContract`/`sendTransaction` as `account`.
	 *   In signer mode this is a viem Local Account (so viem signs locally and
	 *   broadcasts via `eth_sendRawTransaction`); in wallet mode it is the address
	 *   string (a JSON-RPC account, so the wallet signs via `eth_sendTransaction`).
	 * - `client`: the tracked wallet client to send through.
	 */
	| {
			status: 'ready';
			address: `0x${string}`;
			account: Account | `0x${string}`;
			client: ExecutorClient;
	  }
	/**
	 * The connected account cannot send under the current execution mode (e.g.
	 * an email/social account under `wallet` execution). Call sites surface this
	 * as a friendly modal instead of a raw RPC error.
	 */
	| {status: 'cannot-send'};

export type ExecutorStore = Readable<ExecutorState>;

/**
 * Builds the tracked client + account used in signer execution mode.
 *
 * Supplied by the caller (see lib/context) so that the concrete viem client
 * construction, with its precisely-known transport/chain/account types and the
 * app's tx-tracking wiring, lives where those types are in scope. The executor
 * itself stays free of client construction (and of type casts).
 *
 * Called once per distinct private key; the executor caches the result.
 */
export type SignerClientFactory = (privateKey: `0x${string}`) => {
	client: ExecutorClient;
	account: Account;
};

export function createExecutor(params: {
	connection: ChainConnection;
	/** Tracked client bound to the connection provider (wallet execution). */
	walletClient: ExecutorClient;
	executionMode: ExecutionMode;
	/** Builds the signer-mode client (see {@link SignerClientFactory}). */
	buildSignerClient: SignerClientFactory;
}): ExecutorStore {
	const {connection, walletClient, executionMode, buildSignerClient} = params;

	// Cache the signer client + account by private key so we do not rebuild them
	// on every connection emission (the key is stable for a given sign-in).
	let signerCacheKey: string | undefined;
	let signerCache: ReturnType<SignerClientFactory> | undefined;

	function signerMode(privateKey: `0x${string}`): {
		client: ExecutorClient;
		account: Account;
	} {
		if (signerCacheKey === privateKey && signerCache) {
			return signerCache;
		}
		signerCache = buildSignerClient(privateKey);
		signerCacheKey = privateKey;
		return signerCache;
	}

	return derived<ChainConnection, ExecutorState>(
		connection,
		($connection): ExecutorState => {
			const hasAccount = 'account' in $connection && !!$connection.account;
			if (!hasAccount) return {status: 'not-connected'};

			if (executionMode === 'signer') {
				// Requires a local signer, only present once SignedIn.
				if ($connection.step === 'SignedIn') {
					const {client, account} = signerMode(
						$connection.account.signer.privateKey,
					);
					return {
						status: 'ready',
						address: $connection.account.signer.address,
						account,
						client,
					};
				}
				// Signed in via wallet but signature not yet obtained: not ready to
				// send from a signer yet (the sign-in flow will produce one).
				return {status: 'not-connected'};
			}

			// wallet execution mode: send from the connected wallet account.
			// Requires a wallet provider; email/social accounts (SignedIn without a
			// wallet) cannot send directly. The address string is a JSON-RPC account,
			// so the wallet signs via eth_sendTransaction.
			const hasWallet = 'wallet' in $connection && !!$connection.wallet;
			if (!hasWallet) return {status: 'cannot-send'};

			return {
				status: 'ready',
				address: $connection.account.address,
				account: $connection.account.address,
				client: walletClient,
			};
		},
	);
}

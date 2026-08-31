import {expect, type Page} from '@playwright/test';

/**
 * A wallet that HOLDS a transaction request until the test lets it go.
 *
 * WHY THE SUITE NEEDED THIS. Every other e2e drives the burner wallet, which
 * answers instantly and, worse, is deliberately suppressed from the "Wallet
 * Action Required" prompt (see `isBurnerWalletInSelectionPhase` and
 * `work/notes/observations/wallet-action-required-modal-not-seen.md`). So the
 * entire window this app's in-flight machinery exists for, between dispatching
 * `eth_sendTransaction` and hearing back, could not be entered by a test at all.
 * A bug that lost a real transaction in that window shipped past 40 e2e tests
 * and 581 unit tests because nothing could stand in it long enough to click.
 *
 * This is a real EIP-6963 wallet as far as the app is concerned: it announces
 * itself, answers reads by forwarding them to the node, and signs nothing it
 * does not have to. The one difference is that `eth_sendTransaction` parks until
 * {@link approveTransaction} is called, and then really is forwarded, so the
 * transaction genuinely lands on chain and everything downstream is real.
 *
 * The node's accounts are unlocked (hardhat), so forwarding is enough and the
 * fixture needs no key material.
 */

export const STALLING_WALLET_NAME = 'Stalling Test Wallet';

/**
 * The accounts it can sign as, ONE PER SUITE.
 *
 * Hardhat's #9 and #8, chosen to sit well clear of both lists that matter:
 * `e2e/impersonate-addresses.json` (what the burner offers, one per suite that
 * sends) and anything in the env files. Two suites sending from one account race
 * for its nonce, and that surfaces as an unrelated test failing on a transaction
 * that never appeared.
 *
 * A POOL RATHER THAN ONE ADDRESS, because this fixture is the only way into the
 * window between dispatch and answer, so more than one suite legitimately wants
 * it. It was a single account while one suite used it, and the second suite
 * turned that into a nonce race; `test/e2e-account-claims.test.ts` now checks
 * the claims here the same way it checks `walletAccountIndex` for burners.
 */
export const STALLING_WALLET_ACCOUNTS = [
	'0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
	'0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
] as const;

/** The default account, for a suite that does not ask for a particular one. */
export const STALLING_WALLET_ACCOUNT = STALLING_WALLET_ACCOUNTS[0];

/**
 * Install the wallet before any app code runs.
 *
 * Must be called before the page navigates: the app listens for
 * `eip6963:announceProvider` during startup, and a wallet that announces itself
 * after that is simply not there.
 */
export async function installStallingWallet(
	page: Page,
	options: {
		nodeUrl: string;
		/**
		 * Which of {@link STALLING_WALLET_ACCOUNTS} this suite signs as. One suite
		 * per index: the claim is checked by `test/e2e-account-claims.test.ts`,
		 * which reads the call sites, so a second suite taking a claimed index fails
		 * there rather than as a stranger's transaction going missing.
		 */
		stallingAccountIndex?: number;
	},
): Promise<void> {
	const account = STALLING_WALLET_ACCOUNTS[options.stallingAccountIndex ?? 0];
	if (!account) {
		throw new Error(
			`no stalling-wallet account ${options.stallingAccountIndex}: ` +
				`${STALLING_WALLET_ACCOUNTS.length} are configured`,
		);
	}
	await page.addInitScript(
		({nodeUrl, account, name}) => {
			const held: {resolve?: () => Promise<void>} = {};
			// A REAL WALLET ANSWERS `eth_accounts` WITH NOTHING WHEN IT IS LOCKED, and
			// tells listeners so. This used to be a constant and `on` was a no-op, which
			// made one whole class of behaviour untestable: everything that happens when
			// wallet state is REBUILT under a request that is still outstanding. That is
			// the transition that erased `pendingRequests` in @etherplay/connect before
			// 0.10.0, and the reason the bug reached real users is that no test could
			// stand in it. See lockWallet/unlockWallet below.
			let locked = false;
			const listeners = new Map<string, Set<(payload: unknown) => void>>();
			const emit = (event: string, payload: unknown) => {
				for (const listener of listeners.get(event) ?? []) listener(payload);
			};
			// Node calls this wallet is waiting on RIGHT NOW, by method, with the
			// moment each started. Everything except the parked send and the
			// signatures is forwarded to the node with a bare `fetch`, so a node that
			// is slow (four workers against one hardhat) or gone looks IDENTICAL from
			// the outside to an app that never asked the wallet for anything: the
			// modal is up, the page says it is sending, and nothing is held. Naming
			// what it is waiting on is the difference between a five-minute mystery
			// and a one-line answer.
			const inFlight = new Map<number, {method: string; startedAt: number}>();
			(window as any).__stallingWallet = {
				/** Whether a transaction request is parked right now. */
				isHolding: () => !!held.resolve,
				/** What the wallet is waiting on the node for, oldest first. */
				waitingOn: () =>
					[...inFlight.values()]
						.sort((a, b) => a.startedAt - b.startedAt)
						.map((call) => ({
							method: call.method,
							forMs: Math.round(performance.now() - call.startedAt),
						})),
				/** Let the parked transaction through to the node. */
				approve: async () => {
					if (!held.resolve) throw new Error('no transaction is being held');
					await held.resolve();
				},
				/**
				 * The user locked their wallet. Accounts go away and listeners are told,
				 * which is what makes the connection library rebuild its wallet state.
				 *
				 * Anything already parked STAYS PARKED, exactly as a real wallet does: a
				 * request the wallet is holding does not evaporate because the user
				 * locked the screen, and the whole point of the transition is that the
				 * app must not forget it either.
				 */
				lock: () => {
					locked = true;
					emit('accountsChanged', []);
				},
				/** The user unlocked it again. */
				unlock: () => {
					locked = false;
					emit('accountsChanged', [account]);
				},
				/** Hashes this wallet has actually broadcast. */
				sent: [] as string[],
			};

			let id = 0;
			async function rpc(method: string, params: unknown[]) {
				const callId = ++id;
				inFlight.set(callId, {method, startedAt: performance.now()});
				try {
					const res = await fetch(nodeUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({
							id: callId,
							jsonrpc: '2.0',
							method,
							params: params ?? [],
						}),
					});
					const json = await res.json();
					if (json.error) {
						throw Object.assign(new Error(json.error.message), {
							code: json.error.code,
						});
					}
					return json.result;
				} finally {
					inFlight.delete(callId);
				}
			}

			const provider = {
				on(event: string, listener: (payload: unknown) => void) {
					let set = listeners.get(event);
					if (!set) listeners.set(event, (set = new Set()));
					set.add(listener);
				},
				removeListener(event: string, listener: (payload: unknown) => void) {
					listeners.get(event)?.delete(listener);
				},
				async request({method, params}: {method: string; params?: unknown[]}) {
					if (method === 'eth_accounts') {
						return locked ? [] : [account];
					}
					if (method === 'eth_requestAccounts') {
						// Asking to connect is what unlocks a real wallet: the extension
						// puts up its password prompt and the user answers it. Modelling
						// that as "the request succeeds" is what makes the reconnect path
						// reachable at all, and it is the honest behaviour rather than a
						// shortcut: a locked wallet that refused forever could never be
						// driven past this point by any test.
						locked = false;
						return [account];
					}
					if (method === 'wallet_switchEthereumChain') return null;
					if (
						method === 'personal_sign' ||
						method === 'eth_sign' ||
						method === 'eth_signTypedData_v4'
					) {
						// Never reached by a wallet-only target step, and a fake signature
						// is safer than a real one: nothing here should be able to
						// authenticate as this account anywhere else.
						return '0x' + '11'.repeat(65);
					}
					if (method === 'eth_sendTransaction') {
						return new Promise((resolve, reject) => {
							held.resolve = async () => {
								held.resolve = undefined;
								try {
									const hash = await rpc('eth_sendTransaction', params ?? []);
									(window as any).__stallingWallet.sent.push(hash);
									resolve(hash);
								} catch (err) {
									reject(err);
								}
							};
						});
					}
					return rpc(method, params ?? []);
				},
			};

			const detail = Object.freeze({
				info: {
					uuid: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
					name,
					icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
					rdns: 'test.jollyroger.stalling',
				},
				provider,
			});
			const announce = () =>
				window.dispatchEvent(
					new CustomEvent('eip6963:announceProvider', {detail}),
				);
			window.addEventListener('eip6963:requestProvider', announce);
			announce();
		},
		{
			nodeUrl: options.nodeUrl,
			account,
			name: STALLING_WALLET_NAME,
		},
	);
}

/** Whether the wallet is currently holding a transaction request. */
export function isHoldingTransaction(page: Page): Promise<boolean> {
	return page.evaluate(() => (window as any).__stallingWallet.isHolding());
}

/** The user finally approves in their wallet. The transaction really is sent. */
export async function approveHeldTransaction(page: Page): Promise<void> {
	await page.evaluate(() => (window as any).__stallingWallet.approve());
}

/**
 * The user locks their wallet, WITHOUT the wallet dropping what it is holding.
 *
 * The way into the transition that erased `pendingRequests` upstream. A send
 * against a locked wallet raises the connection flow, so `connect()` runs while
 * the wallet is still holding the transaction and rebuilds wallet state
 * underneath it; every rebuild used to assert `pendingRequests: []`, and it
 * erased the request permanently because the list is only written on request
 * events and the next event for a request is the one that ends it.
 *
 * Nothing here is a mock of that bug: this drives a real wallet through a real
 * lock, and what the app then believes is the library's answer.
 */
export async function lockStallingWallet(page: Page): Promise<void> {
	await page.evaluate(() => (window as any).__stallingWallet.lock());
}

/** The user unlocks it again, still without dropping the parked request. */
export async function unlockStallingWallet(page: Page): Promise<void> {
	await page.evaluate(() => (window as any).__stallingWallet.unlock());
}

/** Hashes this wallet has broadcast, for asserting a transaction was real. */
export function sentHashes(page: Page): Promise<string[]> {
	return page.evaluate(() => (window as any).__stallingWallet.sent as string[]);
}

/** What the wallet is waiting on the node for, for a failure message. */
export function walletWaitingOn(
	page: Page,
): Promise<{method: string; forMs: number}[]> {
	return page.evaluate(() => (window as any).__stallingWallet.waitingOn());
}

/**
 * What the transaction {@link sendAndStall} dispatches is CALLED, in the words
 * the app puts on screen for it.
 *
 * Exported next to the walk that sends it, because it is the same fact: change
 * which write the walk drives and this changes with it. A suite that asserts the
 * app named what it is sending (the sending notice does) reads it from here
 * rather than repeating a literal - `setMessage` is the template's
 * GreetingsRegistry, and a descendant that does not deploy it inherited an
 * assertion for a function it never calls, which is this app: it sends
 * `setApprovalForAll`, and the inherited literal made a passing notice look like
 * a broken one.
 *
 * The same name as {@link WRITE_FUNCTION} below, minus the mutability the
 * contracts page prints beside it, because the sending notice shows the function
 * and the contracts page shows the signature.
 */
export const STALLED_SEND_NAME = 'setApprovalForAll';

/**
 * Get this app to hand the stalling wallet a transaction, and leave it holding
 * it. Call {@link installStallingWallet} first: the wallet has to be announced
 * before the app starts looking.
 *
 * ONE PLACE, BECAUSE THE ROUTE TO THAT WINDOW IS AN APP'S OWN BUSINESS. Two
 * suites need a wallet that is holding something (the escape hatch and the
 * sending indicator), and both used to open-code the same walk: pick the page,
 * fill it, submit, choose the wallet, wait. That is the shape `e2e/routes.ts`
 * exists to prevent, and it rotted the same way: a descendant that sends through
 * a LOCAL SIGNER has no wallet in the demo page's Send at all, so the walk has
 * to change, and when only one of the two copies was adapted the other spent
 * thirty seconds waiting for a wallet that was never going to be asked. It did
 * not look like a stale test either; it looked like the indicator was broken.
 *
 * So a descendant overrides THIS function and inherits both suites. What it must
 * end up in is the only part that is fixed: a wallet holding a request, with
 * nothing else on screen waiting on the test.
 *
 * The two tolerances below are here for the same reason, and both are inert in
 * this app:
 *
 * - the wallet LIST may be collapsed behind one button when the app also offers
 *   email or social sign-in, so the picker is two clicks rather than one
 *   (`walletEntryMode`).
 * - the flow may stop at "Confirm sign in" before it asks the wallet for
 *   anything, in an app that signs in rather than merely connecting. Skipping
 *   that click leaves the connection parked there forever, no request ever
 *   reaches the wallet, and the failure surfaces as a timeout three assertions
 *   later.
 *
 * Both are written as "click it if it is there" rather than as a branch on which
 * app this is, so this file stays the same in a descendant that only adds one of
 * them. NEITHER MAY COST TIME IT DOES NOT NEED: a caller measures from the
 * moment this returns, so a fixed "wait 2s in case a sign-in modal appears"
 * spends the delay the sending notice is being timed against, and the suite
 * fails claiming the app was too fast. See {@link waitUntilHolding}.
 */
export async function sendAndStall(
	page: Page,
	options?: {
		/**
		 * A distinctive value to send, for a caller that will later assert THEIR
		 * input survived. Optional, and that is the interface working rather than
		 * a convenience.
		 *
		 * WHAT IT IS HAS TO BE THE APP'S BUSINESS, not the caller's. This app fills
		 * `setApprovalForAll`'s OPERATOR argument, so a caller that passes something
		 * must pass an address. A suite that hardcoded a greeting there would fill an
		 * invalid field, so the form never submits and nothing reaches the wallet,
		 * which is the same failure this whole helper exists to stop, one layer in. A
		 * suite that does not care omits it and gets whatever this app can send.
		 */
		input?: string;
	},
): Promise<void> {
	// THROUGH /contracts AND A WRITE THIS APP CAN ACTUALLY MAKE, which is the
	// override the template's version was written to receive.
	//
	// THE PAGE. The template drives `/demo/` and its GreetingsRegistry, which this
	// app replaced and does not deploy, so the inherited walk never found a form.
	// That is why this suite was deleted here rather than adapted (4d09f4a1).
	// `/contracts` is still here, its Write tab calls the ACCOUNT executor, and
	// that goes to the user's wallet, which is the window this fixture exists to
	// stand in.
	//
	// THE FUNCTION. `setApprovalForAll(address operator, bool approved)`, on Bleeps
	// like every ERC721. Chosen because it CANNOT REVERT and needs nothing set up
	// first: no token, no sale, no minter role. That matters more than it looks. A
	// call the node can see will fail dies in GAS ESTIMATION, which happens before
	// `eth_sendTransaction`, so the wallet is never asked and there is no held
	// request to stop waiting for. `transferFrom`, which contracts.e2e.ts asserts
	// on for the same "needs no role" reason, would revert here because this
	// account owns no token.
	//
	// Revoking (`false`) rather than granting, so the call is harmless whoever it
	// names, and it is never mined anyway: the wallet parks it.
	//
	// Stated HERE rather than in a suite, because the suite is inherited and a
	// suite that restates it goes stale on its own.
	await page.goto('/contracts');

	// This page's write only reaches a wallet once the app has hydrated;
	// clicking through before that opens the connect modal instead of
	// dispatching, and then there is no held transaction to stop waiting for.
	//
	// THE WEAK WAIT ON PURPOSE, not `waitForAppReady`. `data-connected` is FALSE
	// here and stays false - nothing is connected yet, and this walk is what
	// connects it, by choosing the stalling wallet below. All that is needed is
	// that the navbar has an OPINION, i.e. it hydrated. Waiting for the
	// connection to settle instead (which is what waitForAppReady is for, and
	// what the offline tests genuinely need) costs this walk the whole
	// connection round trip up front, and under a full parallel run against one
	// node that pushed the first test of the escape-hatch suite past its
	// two-minute budget while the app sat there saying "Executing...".
	await expect(page.locator('[data-testid="wallet-status"]')).toHaveAttribute(
		'data-connected',
		/true|false/,
		{timeout: 30_000},
	);

	const writeTab = page.getByRole('tab', {name: 'Write'});
	await expect(writeTab).toBeVisible({timeout: 30_000});
	await writeTab.click();

	await expect(page.getByText(WRITE_FUNCTION)).toBeVisible({timeout: 30_000});

	// BOTH inputs. Filling only one leaves the other undefined and viem throws
	// before anything reaches the wallet, so there is never a held transaction.
	await writeForm(page)
		.getByPlaceholder('0x...')
		.first()
		// The zero address when a caller does not care: approving nothing, revoked.
		.fill(options?.input ?? '0x0000000000000000000000000000000000000000');
	// A `bool` is a <select>, not a text input, so this is `selectOption` rather
	// than `fill`. `getInputPlaceholder` returns 'Select true/false' for bool and
	// is never reached: `FunctionInputs.svelte` branches to a <select> before it,
	// so a fixture written against that placeholder waits for an element that does
	// not exist and dies six minutes later on a timeout that says nothing.
	await writeForm(page).locator('select').first().selectOption('false');
	await executeButton(page).click();

	await chooseStallingWallet(page);

	// The wallet now has the transaction and is not answering, which is the state
	// a user gets stuck in. `waitUntilHolding` also clicks through "Confirm sign
	// in", which THIS app always shows: the flow parks at WalletConnected until
	// the user says yes, and skipping it leaves the connection there forever with
	// no request ever reaching the wallet.
	await waitUntilHolding(page);
}

/**
 * The write this fixture drives, named once.
 *
 * `setApprovalForAll`, for the reasons in `sendAndStall` above. The
 * suites import it rather than restating it, because a suite that asserts on a
 * form has to be looking at the form that was actually filled.
 */
export const WRITE_FUNCTION = 'setApprovalForAll nonpayable';

/**
 * The write form `sendAndStall` drives, and its submit control.
 *
 * Exported because a suite asserts on the very control this clicked (that it
 * says "Executing..." and stops saying it), and two definitions of the same
 * locator is one definition too many.
 *
 * The submit control is matched on the STEM, so it is the same locator whether
 * it reads "Execute" or "Executing...". `/execute/i` matches only the first of
 * those, since "executing" does not contain "execute", and a test then reads as
 * though the button had vanished at exactly the moment it was busy.
 */
export const writeForm = (page: Page) =>
	page
		.locator('[class*="card"], [class*="function"]')
		.filter({has: page.getByText(WRITE_FUNCTION)})
		.first();

export const executeButton = (page: Page) =>
	writeForm(page).locator('button', {hasText: /execut/i});

/**
 * Pick this wallet out of however the app is offering wallets today.
 *
 * With several wallets and nothing else to sign in with, the list is shown
 * directly; sharing the modal with email or social collapses it behind one
 * button instead of drowning them. Waiting for EITHER and clicking through when
 * the button is there keeps one helper correct for both.
 */
export async function chooseStallingWallet(page: Page): Promise<void> {
	const walletEntry = page.getByRole('button', {name: /^connect a wallet$/i});
	const stallingWallet = page.getByRole('button', {
		name: new RegExp(STALLING_WALLET_NAME, 'i'),
	});

	await expect(walletEntry.or(stallingWallet).first()).toBeVisible({
		timeout: 30_000,
	});
	if (await walletEntry.isVisible().catch(() => false)) {
		await walletEntry.click();
	}
	await stallingWallet.click({timeout: 30_000});
}

/**
 * Wait until the wallet is holding the request, confirming sign-in on the way if
 * this app asks for it.
 *
 * RACED, NOT SEQUENCED, and that is the whole design of it. "Click Sign In if it
 * shows up within 2s, then wait for the wallet" is the obvious version and it is
 * wrong twice: it burns two seconds in an app that never asks, and two seconds
 * is not obviously enough in one that does, under load. Watching for both
 * outcomes at once costs nothing when the wallet is asked directly, and waits as
 * long as it takes when a modal is in the way.
 *
 * An app that signs in parks at "Confirm sign in" until the user says yes, and
 * the stalling wallet answers the sign-in signature with a fixed fake one
 * (nothing verifies it locally: it is entropy for deriving a signer, and a real
 * key here would let this fixture authenticate as that account elsewhere).
 */
async function waitUntilHolding(page: Page, timeout = 60_000): Promise<void> {
	const signIn = page.getByRole('button', {name: /^sign in$/i});
	const deadline = Date.now() + timeout;

	while (Date.now() < deadline) {
		// Asked FIRST on every pass, so the loop returns the instant the wallet has
		// it and a caller's clock starts as close to the dispatch as it can.
		if (await isHoldingTransaction(page).catch(() => false)) return;
		if (await signIn.isVisible().catch(() => false)) {
			// May lose a race with the app moving on; that is fine, the next pass
			// looks again.
			await signIn.click().catch(() => {});
		}
		await page.waitForTimeout(100);
	}

	// What the wallet itself was doing, because the three explanations look
	// identical from the page: a flow parked on a step nobody answered, an app
	// that does not send through the wallet here at all, and a wallet waiting on a
	// node that is not keeping up. Only the last one names an RPC method.
	const waiting = await walletWaitingOn(page).catch(() => []);
	throw new Error(
		`the stalling wallet was never handed a transaction within ${timeout}ms.\n` +
			`The wallet is waiting on the node for: ${
				waiting.length === 0
					? 'nothing (so the app never got as far as asking it)'
					: waiting.map((c) => `${c.method} (${c.forMs}ms)`).join(', ')
			}.\n` +
			`Nothing waiting means the flow is parked on a step this helper does ` +
			`not know how to answer, or this app does not send through the user's ` +
			`wallet here at all - a descendant that signs with a key of its own has ` +
			`to point sendAndStall at a page that does. A method waiting for many ` +
			`seconds means the node is the bottleneck, and the lever is the worker ` +
			`count in playwright.config.ts, not this timeout.`,
	);
}

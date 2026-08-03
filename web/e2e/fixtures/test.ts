import {
	test as base,
	expect,
	type Page,
	type BrowserContext,
} from '@playwright/test';
import {IMPERSONATE_ADDRESSES} from '../../src/lib/dev-accounts';

/**
 * Extended test fixtures for E2E testing with wallet interactions.
 *
 * Each test starts with a clean browser state:
 * 1. playwright.config.ts sets storageState: {cookies: [], origins: []} for initial state
 * 2. This fixture creates a fresh context and clears localStorage on the target origin
 *    before any test code runs, ensuring complete isolation from auto-connect behavior
 */

// The addresses the burner wallet can impersonate come from the single source
// of truth shared with the app wiring: src/lib/dev-accounts.ts.

// Hardhat node URL. Use the IPv4 literal: the node binds to 127.0.0.1, and
// Node's fetch can resolve `localhost` to ::1 first, failing intermittently.
// Overridable so a run can avoid a port already in use on the machine; must
// agree with what scripts/run-e2e-tests.sh started the node on.
const RPC_PORT = (globalThis as any).process.env.E2E_RPC_PORT || '8545';
const HARDHAT_RPC_URL =
	(globalThis as any).process.env.E2E_RPC_URL || `http://127.0.0.1:${RPC_PORT}`;

// The app's base URL comes from playwright.config.ts (`use.baseURL`), so tests
// navigate with relative paths and nothing here needs to duplicate it.

/**
 * Fund an address using Hardhat's hardhat_setBalance RPC method.
 * This is useful for tests where we need to ensure the wallet has ETH.
 */
async function fundAddressViaHardhat(
	address: string,
	amountInEth = '100',
): Promise<void> {
	// Convert ETH to wei (hex)
	const weiAmount = BigInt(parseFloat(amountInEth) * 1e18);
	const hexAmount = '0x' + weiAmount.toString(16);

	const response = await fetch(HARDHAT_RPC_URL, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'hardhat_setBalance',
			params: [address, hexAmount],
			id: 1,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to set balance: ${response.statusText}`);
	}
}

export interface WalletOptions {
	/**
	 * Which burner account (index into IMPERSONATE_ADDRESSES) the connect flow
	 * picks in the account-picker dialog.
	 *
	 * All e2e tests share ONE chain and the GreetingsRegistry keeps ONE message
	 * per account, so two test files writing from the same account clobber each
	 * other's message mid-test (files run in parallel workers). Give a file that
	 * writes messages its own account with `test.use({walletAccountIndex: 1})`
	 * so its writes cannot race the demo suite's (which uses the default 0).
	 */
	walletAccountIndex: number;
}

export interface WalletFixtures {
	/**
	 * Page with clean localStorage - starts with no wallet connection state.
	 * This overrides the default page fixture to ensure test isolation.
	 */
	page: Page;

	/**
	 * Page with wallet connected via Dev Mode (burner wallet).
	 * Automatically handles the connection flow.
	 */
	connectedPage: Page;

	/**
	 * Connects the wallet using Dev Mode on the current page.
	 * Can be used when you need more control over when connection happens.
	 */
	connectWallet: (page: Page) => Promise<void>;

	/**
	 * Ensures the test wallet addresses have ETH on the Hardhat node.
	 * Call this before tests that need funded wallets.
	 */
	fundWallets: () => Promise<void>;
}

// The app's authoritative connection signal (see navbar.svelte). Reading the
// navbar balance text instead gives false negatives: the balance span renders
// empty while the balance is still loading and is hidden below the `sm`
// breakpoint, so a connected app reads as disconnected.
const WALLET_STATUS = '[data-testid="wallet-status"]';

async function isWalletConnected(page: Page): Promise<boolean> {
	const attr = await page
		.locator(WALLET_STATUS)
		.getAttribute('data-connected')
		.catch(() => null);
	return attr === 'true';
}

/** Assert the wallet is connected, failing with a clear message if it is not. */
async function expectWalletConnected(page: Page, timeout = 30_000) {
	await expect(
		page.locator(WALLET_STATUS),
		'wallet should be connected (navbar data-connected)',
	).toHaveAttribute('data-connected', 'true', {timeout});
}

/**
 * Connect wallet via the burner wallet.
 *
 * The connect flow is a sequence of modals whose order varies with config and
 * auto-connect state (the account picker can appear immediately on page load
 * when a multi-account wallet auto-reconnects, without any connect button):
 *
 * - connect entry: "Dev Mode" (SignedIn + dev) or "Connect <wallet>" button
 * - account picker: "N accounts available, choose one" (multi-account wallet)
 * - sign-in confirm: "Confirm sign in" (SignedIn config)
 *
 * Rather than assuming an order, poll for whichever dialog is currently shown
 * and act on it, until no connect-flow dialog remains (or timeout).
 */
async function connectWalletDevMode(
	page: Page,
	accountIndex = 0,
): Promise<void> {
	const deadline = Date.now() + 20_000;

	while (Date.now() < deadline) {
		const dialog = page.locator('[role="dialog"]');
		const dialogVisible = await dialog
			.first()
			.isVisible({timeout: 1000})
			.catch(() => false);

		if (!dialogVisible) {
			// No dialog on screen means EITHER the connection completed, OR the next
			// modal has simply not opened yet (transitions lag under load).
			//
			// Concluding "done" from the absence of a dialog is a trap: the helper
			// returns before the account picker has rendered, the test then acts, the
			// picker opens with nobody left to answer it, and no transaction is ever
			// sent - surfacing much later as an unrelated assertion failure. Only
			// stop once the app itself reports a connection.
			if (await isWalletConnected(page)) break;
			await page.waitForTimeout(250);
			continue;
		}

		// The dialog may close between the isVisible check above and this read;
		// without an explicit timeout, textContent would wait forever (Playwright's
		// default action timeout is unlimited) and hang the fixture until the test
		// times out. Bound it and treat a vanished dialog as "loop again".
		const text = await dialog
			.first()
			.textContent({timeout: 2000})
			.catch(() => null);
		if (text === null) continue;

		if (/wallets available, choose one/i.test(text)) {
			// Wallet list (multiple injected wallets, shown inline under wallet-only
			// auth or via the picker): choose the burner wallet.
			await dialog
				.locator('.overflow-y-auto > button', {hasText: 'Burner Wallet'})
				.first()
				.click();
		} else if (/accounts available, choose one/i.test(text)) {
			// Account picker: pick the configured account in the scrollable list.
			// Use the DIRECT children of the list: each account row button nests a
			// "Copy address" button inside it, so a descendant selector ('div button')
			// would interleave copy buttons into the index space and .nth(1) would hit
			// account 0's copy button instead of account 1.
			await dialog
				.locator('.overflow-y-auto > button')
				.nth(accountIndex)
				.click();
		} else if (/confirm sign in/i.test(text)) {
			// Under a sign-in target, the confirm dialog may be the COMBINED
			// choose+sign-in modal (multi-account wallet): select the configured
			// account row first (same direct-child locator as the plain picker),
			// then sign. With no rows (single-account confirm), just sign.
			const rows = dialog.locator('.overflow-y-auto > button');
			if ((await rows.count()) > accountIndex) {
				await rows.nth(accountIndex).click();
			}
			await page.getByRole('button', {name: /^sign in$/i}).click();
		} else if (/insufficient funds|funds available/i.test(text)) {
			// Funding is handled by handleInsufficientFundsModal below.
			break;
		} else {
			// Connect entry: dev-mode button (SignedIn + dev) or the wallet connect
			// button (accessible name includes the icon alt text, so match loosely).
			const entry = page
				.getByRole('button', {name: /dev mode/i})
				.or(page.getByRole('button', {name: /connect .*wallet/i}))
				.first();
			const entryVisible = await entry
				.isVisible({timeout: 1000})
				.catch(() => false);
			if (entryVisible) {
				await entry.click();
			} else {
				// Unknown dialog (e.g. a transient step): wait for it to change.
				await page.waitForTimeout(500);
			}
		}
		await page.waitForTimeout(250);
	}

	// Handle Insufficient Funds modal - click "Get ETH" to use the faucet API
	await handleInsufficientFundsModal(page);

	// Fail here, loudly and at the real cause, rather than handing back a page
	// that is not connected and letting a later assertion take the blame.
	await expectWalletConnected(page);
}

/**
 * Handle the Insufficient Funds modal by clicking "Get ETH" and then "Continue Transaction".
 * This modal appears when the wallet is connected but doesn't have enough ETH.
 */
async function handleInsufficientFundsModal(page: Page): Promise<void> {
	const getEthButton = page.getByRole('button', {name: /get eth/i});

	// The modal is genuinely optional, so its ABSENCE is not an error - but once
	// it is on screen the rest of the flow must work. Wrapping the whole sequence
	// in `catch {}` also swallowed a BROKEN funding flow, so a test that never got
	// its ETH failed later somewhere unrelated.
	const appeared = await getEthButton
		.waitFor({state: 'attached', timeout: 5000})
		.then(() => true)
		.catch(() => false);

	if (!appeared) return;

	// Wait for it to be enabled (not loading)
	await expect(getEthButton).toBeEnabled({timeout: 30000});

	// Click "Get ETH" - this will call the faucet API
	await getEthButton.click();

	// Wait for "Continue Transaction" button to appear and be enabled
	const continueButton = page.getByRole('button', {
		name: /continue transaction/i,
	});
	await continueButton.waitFor({state: 'visible', timeout: 30000});
	await expect(continueButton).toBeEnabled({timeout: 10000});

	// Click "Continue Transaction" to proceed with the original transaction
	await continueButton.click();

	// Wait for the modal to close.
	// NOTE: waitForFunction's signature is (fn, arg, options); options must be
	// the THIRD argument or the timeout silently never applies (waits forever).
	await page.waitForFunction(
		() => {
			const modal = document.querySelector('[role="dialog"]');
			return !modal || !modal.textContent?.includes('Funds');
		},
		undefined,
		{timeout: 10000},
	);
}

// NOTE: there is deliberately no `waitForTransaction` helper here.
//
// The one that used to live at this spot wrapped both of its waits in `catch {}`
// and so was incapable of failing: it returned after ~40s whether or not
// anything had settled. It also polled `[class*="animate-spin"]`, which matches
// any loading spinner on the page, so it could report success while a write was
// still open. A helper that cannot fail turns every real defect into a confusing
// failure somewhere else later.
//
// Writing an honest one needs a per-write pending flag in the app to wait on
// (jolly-roger has `data-testid="message-pending"` on its greeting rows). Bleeps
// has no equivalent yet, and no e2e test currently sends a transaction, so
// rather than ship another helper that only pretends to wait, the next person to
// add a minting test should add the flag and the helper together.

export const test = base.extend<WalletFixtures & WalletOptions>({
	// Option fixture: which burner account the connect flow selects.
	// Override per file/describe with `test.use({walletAccountIndex: 1})`.
	walletAccountIndex: [0, {option: true}],
	/**
	 * Override the default page fixture to ensure each test starts with clean storage.
	 *
	 * This creates a fresh browser context with empty storage state for each test,
	 * then navigates to the app to clear any storage on the correct origin,
	 * ensuring no previous wallet connection state persists between tests.
	 */
	page: async ({browser}, use) => {
		// A brand-new context is already storage-isolated, and the explicit
		// storageState states that: no cookies, no origin storage. So there is
		// nothing to clear before the test runs.
		//
		// This used to prime the context by navigating to the app origin with
		// `waitUntil: 'commit'`, clearing storage, then navigating to about:blank.
		// Committing and immediately navigating away races the in-flight load and
		// can abort it outright (`net::ERR_ABORTED`), failing a test before it has
		// run a line of its own code. The dance bought no isolation the fresh
		// context did not already provide.
		//
		// Storage must NOT be cleared on every navigation (e.g. via addInitScript):
		// the app persists the wallet connection there, and tests that navigate
		// between pages rely on it surviving.
		const context = await browser.newContext({
			storageState: {cookies: [], origins: []},
		});

		const page = await context.newPage();

		await use(page);
		await context.close();
	},

	/**
	 * Fund wallet addresses via Hardhat RPC before tests.
	 */
	fundWallets: async ({}, use) => {
		const fundAll = async () => {
			for (const address of IMPERSONATE_ADDRESSES) {
				await fundAddressViaHardhat(address, '100');
			}
		};
		await use(fundAll);
	},

	/**
	 * Provides a page that's already connected to a wallet.
	 * Usage:
	 *   test('my test', async ({ connectedPage }) => { ... })
	 */
	connectedPage: async ({page, fundWallets, walletAccountIndex}, use) => {
		// Fund the wallet addresses BEFORE navigating to the page
		// This ensures the wallet has ETH when the app auto-connects
		await fundWallets();

		// Navigate to the editor, the one page that needs a live app context
		await page.goto('/editor');

		// Wait for app to initialize
		await expect(
			page.getByRole('heading', {name: /melody editor/i}),
		).toBeVisible({timeout: 30000});

		// Ask the app whether it is connected rather than inferring it from the
		// navbar balance: that span is empty while loading and hidden below the `sm`
		// breakpoint, so the old check reported "disconnected" for an already
		// connected app and re-ran the connect flow on top of itself, re-opening the
		// account picker mid-test.
		if (!(await isWalletConnected(page))) {
			// Connect through the navbar's dedicated Connect affordance.
			//
			// This used to fill a greeting input and `click({force: true})` a Send
			// button - neither of which exists on this page; the `input` identifier
			// was not even declared, so this branch threw ReferenceError the moment it
			// was reached. It was inherited from the template's demo page and never
			// adapted. Beyond that, `force: true` skips actionability, so while the
			// app was still initialising the click was a silent no-op and the connect
			// flow never started at all.
			const connectButton = page.getByRole('button', {name: /^connect$/i});
			await expect(connectButton, 'navbar should offer Connect').toBeEnabled({
				timeout: 30_000,
			});
			await connectButton.click();

			// Handles the wallet/account/sign-in modals, funding, and asserts that the
			// app really did end up connected.
			await connectWalletDevMode(page, walletAccountIndex);
		}

		await expectWalletConnected(page);

		await use(page);
	},

	/**
	 * Provides a function to connect wallet on demand.
	 */
	connectWallet: async ({fundWallets, walletAccountIndex}, use) => {
		// Ensure wallets are funded before connecting
		await fundWallets();
		await use((page: Page) => connectWalletDevMode(page, walletAccountIndex));
	},
});

export {expect};

// Re-export describe for convenience
export const describe = test.describe;

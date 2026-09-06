import type {Page} from '@playwright/test';
import {test, expect, describe} from '../fixtures/test';
import {
	approveHeldTransaction,
	executeButton,
	installStallingWallet,
	isHoldingTransaction,
	lockStallingWallet,
	sendAndStall as stallARequest,
	sentHashes,
	STALLING_WALLET_NAME,
	writeForm,
} from '../fixtures/stalling-wallet';

/**
 * The escape hatch, driven through the window it exists for (ADR-0004, `work`).
 *
 * WHAT THIS CAUGHT. The first version of "Stop waiting" called
 * `connection.cancel()`, which sets the flow to Idle, clears the wallet and
 * calls `deleteLastWallet()`. The account went away, and account data with it.
 * The user then approved in their wallet, the transaction landed, and
 * `transaction:broadcasted` had nowhere to file it: the app showed "Transaction
 * error: accountData not ready" over a greeting that had in fact been posted,
 * and kept no record of the transaction at all. The feature built to stop the
 * app losing transactions was losing them.
 *
 * It is driven with a stalling wallet rather than the burner because the burner
 * answers instantly and is suppressed from the wallet-action prompt entirely, so
 * none of this is reachable with it. See e2e/fixtures/stalling-wallet.ts.
 *
 * DRIVEN THROUGH /contracts IN THIS APP, not the demo page. The template drives
 * `/demo/` and its GreetingsRegistry, which this app replaced and does not
 * deploy, so the inherited walk found no form and this whole suite was deleted
 * here rather than adapted (4d09f4a1). The behaviour it covers is real in this
 * app and was left uncovered, which the deletion commit said out loud and named
 * as a task; this is that task. The code under test is the same
 * (`core/connection/wallet-activity.ts`), reached the way THIS app reaches it:
 * the Write tab on `/contracts` calls the ACCOUNT executor, which goes to the
 * user's wallet.
 *
 * The write is `setApprovalForAll`, chosen because it cannot revert and needs no
 * token, sale or minter role. See e2e/fixtures/stalling-wallet.ts for why that
 * is load-bearing rather than incidental.
 */
describe('Stopping waiting for the wallet', () => {
	// Sends transactions, from the stalling wallet's own account rather than a
	// burner one (see STALLING_WALLET_ACCOUNT), so it races nothing. Serial
	// anyway: `fullyParallel` applies to tests, and these share one account.
	describe.configure({mode: 'serial'});

	// SLOW BY NATURE IN THIS APP, so the budget is tripled rather than the run
	// being made quieter.
	//
	// Every test here walks the whole way to a wallet holding a transaction:
	// load `/contracts` (which in this app renders several large contracts and
	// reads them), connect, then send. That is the heaviest walk in the
	// suite, it is almost entirely chain round-trips, and it shares ONE hardhat
	// node with every other worker (see the workers note in
	// playwright.config.ts, which caps them for the same reason).
	//
	// Measured: with both stalling-wallet suites doing real work - which they
	// only started doing once the sending indicator's suite was fixed - whichever
	// of the two met the node at a bad moment ran past the default two minutes,
	// sitting on "Executing..." with the send waiting on RPC. At 4 workers that
	// was the escape hatch, at 3 the sending indicator: the signature of
	// contention rather than of a stuck app. Both pass alone and with the suite
	// narrowed.
	//
	// A budget is the right lever here because nothing being measured is a
	// duration: this suite asserts an ORDER (pulse before words) and a floor
	// (words not before their delay), both of which stay true on a slow box.
	test.slow();

	const nodeUrl =
		(globalThis as any).process.env.E2E_RPC_URL ||
		`http://127.0.0.1:${(globalThis as any).process.env.E2E_RPC_PORT || '8545'}`;

	// The connection flow's modals are SYSTEM overlays: their visibility is derived
	// from `$connection.step`, so they sit in the layer above ordinary modals.
	const dialog = (page: Page, hasText: string | RegExp) =>
		page.locator('#--layer-system [role="dialog"]', {hasText});

	/**
	 * One distinctive address per test, so each proves its OWN input survived.
	 * They are never sent anywhere: every call here is held by a wallet that does
	 * not answer, so these are only ever bytes in a form.
	 */
	const ADDRESSES = {
		copy: '0x0000000000000000000000000000000000000011',
		reconnect: '0x0000000000000000000000000000000000000015',
		noWallet: '0x0000000000000000000000000000000000000016',
		locked: '0x0000000000000000000000000000000000000017',
		staysConnected: '0x0000000000000000000000000000000000000012',
		released: '0x0000000000000000000000000000000000000013',
		approvedLater: '0x0000000000000000000000000000000000000014',
	} as const;

	/**
	 * The modal that says the wallet is holding a transaction.
	 *
	 * Matched on the transaction wording rather than the old fixed title "Wallet
	 * Action Required": since @etherplay/connect 0.10.0 a pending request carries
	 * what it is FOR and WHO is expected to answer it, so the modal names what is
	 * being asked (see `walletPromptCopy`). Named here once because it is this
	 * suite's entry point, not its subject.
	 */
	const waitingModal = (page: Page) =>
		dialog(page, 'Confirm the transaction in your wallet');

	const escapeHatch = (page: Page) =>
		waitingModal(page).getByRole('button', {name: 'Stop waiting'});

	/**
	 * The library's own count, read where it lives SINCE 0.11.0.
	 *
	 * `connection.pendingRequests`, not `connection.wallet.pendingRequests`. The
	 * mirror on the wallet is deprecated and, more to the point here, absent from
	 * exactly the states these tests drive into: a flow resting with no wallet
	 * while the user's wallet is still holding a prompt. Reading the mirror would
	 * make the assertion below pass for the wrong reason on one path and fail for
	 * the wrong reason on the other.
	 */
	const pendingRequestCount = (page: Page) =>
		page.evaluate(
			() =>
				((globalThis as any).get((globalThis as any).context.connection)
					.pendingRequests?.length ?? 0) as number,
		);

	const walletStatus = (page: Page) =>
		page.evaluate(
			() =>
				(globalThis as any).get((globalThis as any).context.connection).wallet
					?.status,
		);

	/**
	 * THE BROWSER'S ANSWER, NOT THE APP'S OPINION OF IT: a real cancelable
	 * `beforeunload`, through whatever listener is actually installed.
	 *
	 * Dispatched here rather than through the `appNavigation.simulateUnload()`
	 * debug handle, which does exactly this and is `import.meta.env.DEV` only, so
	 * it is absent from the production build the e2e suite runs and this read
	 * silently threw. Asking the browser directly needs no dev affordance and tests
	 * the same wiring: `navigation-driver` calls `preventDefault()` and sets
	 * `returnValue`, and only a registered guard returning true does that.
	 */
	const wouldBlockUnload = (page: Page) =>
		page.evaluate(() => {
			const event = new Event('beforeunload', {cancelable: true});
			window.dispatchEvent(event);
			return event.defaultPrevented;
		});

	/**
	 * Send, leave the wallet holding it, and check the app says so.
	 *
	 * The walk itself is `sendAndStall` in the fixture, shared with the sending
	 * indicator's suite. In THIS app it drives `/contracts` and `setApprovalForAll`
	 * rather than the demo page and `setMessage`, because the template's
	 * GreetingsRegistry is not deployed here at all.
	 *
	 * Stated once, in the fixture, so that a second suite needing the same window
	 * inherits it rather than restating it.
	 *
	 * What stays here is the ASSERTION, which is this suite's subject rather than
	 * its setup: the modal is the thing that offers the escape hatch, so every
	 * test below starts from it being on screen.
	 */
	async function sendAndStall(page: Page, player: string) {
		await installStallingWallet(page, {nodeUrl});
		await stallARequest(page, {input: player});
		await expect(waitingModal(page)).toBeVisible({
			timeout: 30_000,
		});
	}

	/** Take the escape hatch: the trigger, then the confirmation. */
	async function stopWaiting(page: Page) {
		await waitingModal(page)
			.getByRole('button', {name: 'Stop waiting'})
			.click();
		const confirmation = dialog(page, 'Your wallet still has this transaction');
		await expect(confirmation).toBeVisible({timeout: 15_000});
		await confirmation.getByRole('button', {name: 'Stop waiting'}).click();
	}

	test('tells the truth, and never offers to cancel', async ({page}) => {
		await sendAndStall(page, ADDRESSES.copy);

		await waitingModal(page)
			.getByRole('button', {name: 'Stop waiting'})
			.click();

		const confirmation = dialog(page, 'Your wallet still has this transaction');
		await expect(confirmation).toBeVisible({timeout: 15_000});
		// The app cannot take back a request the wallet already has, so it must
		// not offer a control that implies it can.
		await expect(confirmation).toContainText('cannot take a request back');
		await expect(confirmation).toContainText('it will still be sent');
		await expect(
			confirmation.getByRole('button', {name: 'Keep waiting'}),
		).toBeVisible();
		await expect(
			confirmation.getByRole('button', {name: /^cancel$/i}),
		).toHaveCount(0);
	});

	test('releases the modal WITHOUT disconnecting the account', async ({
		page,
	}) => {
		await sendAndStall(page, ADDRESSES.staysConnected);
		// Captured rather than named, for the same reason as the locked test below:
		// which step a connected app rests on is its TARGET step. The claim here is
		// that stopping waiting moves NOTHING, and comparing against what it was
		// says that directly instead of encoding one app's answer.
		const stepBefore = await page.evaluate(
			() =>
				(globalThis as any).get((globalThis as any).context.connection).step,
		);
		await stopWaiting(page);

		// The blocking modal is gone, which is what the user asked for.
		await expect(waitingModal(page)).toHaveCount(0);

		// And nothing else moved. Disconnecting here is what destroyed the app's
		// ability to record the transaction when it eventually landed.
		const state = await page.evaluate(() => ({
			step: (globalThis as any).get((globalThis as any).context.connection)
				.step,
			accountDataReady: (globalThis as any).context.accountData.isReady(),
		}));
		expect(state.step).toBe(stepBefore);
		expect(state.accountDataReady).toBe(true);

		// It must not claim anything about a request it is still listening for.
		await expect(dialog(page, 'may have been sent')).toHaveCount(0);
	});

	test('releases the submit button, which the wallet may never answer', async ({
		page,
	}) => {
		// Reported from real use: the modal went, and the button stayed disabled and
		// spinning. The page was awaiting a promise that a wallet is under no
		// obligation to settle, so no amount of waiting would have fixed it.
		// A distinctive but harmless amount, so the assertion below that it is
		// still there is actually about this test's input.
		const player = ADDRESSES.released;
		await sendAndStall(page, player);

		// The label, not the `disabled` attribute: this control stays clickable on
		// purpose (see ContractFunction.svelte) and reports being busy in words. What
		// the bug looked like was those words never going away, because the page was
		// awaiting a promise the wallet is under no obligation to settle.
		const execute = executeButton(page);
		await expect(execute).toHaveText(/executing/i);

		await stopWaiting(page);

		await expect(execute).toHaveText(/^execute$/i, {timeout: 15_000});
		// And what they typed is still there. They have not been told anything
		// happened, so taking their text away would be the app deciding it did.
		await expect(writeForm(page).getByPlaceholder('0x...').first()).toHaveValue(
			player,
		);
		// Released without withdrawing anything: the wallet still has the request.
		expect(await isHoldingTransaction(page)).toBe(true);
	});

	test('survives the reconnect that used to erase the request', async ({
		page,
	}) => {
		// THE BUG THIS SUITE COULD NOT SEE UNTIL NOW, driven end to end from the
		// consumer side.
		//
		// A send against a LOCKED wallet raises the connection flow, so `connect()`
		// runs while the wallet is still holding the transaction and rebuilds wallet
		// state underneath it. Every rebuild in @etherplay/connect used to assert
		// `pendingRequests: []`, which erased the outstanding request PERMANENTLY:
		// the list is only written on request events, and the next event for a
		// request is the one that ends it, so nothing ever put it back. A real
		// locked-Rabby session logged `pendingRequests: 0` with
		// `inFlight.dispatching: 1`
		// (work/notes/observations/wallet-action-required-modal-not-seen.md on
		// `work`). 0.10.0 copies the live list from the provider wrapper at every
		// rebuild instead.
		//
		// Asserted on BOTH layers on purpose. The three affordances staying up is
		// what the user experiences, but this app also keeps its own dispatch ledger,
		// which would hold all three up on its own and hide an upstream regression
		// completely. So the library's list is read directly too: that number is the
		// one that was 0.
		await sendAndStall(page, ADDRESSES.reconnect);

		expect(await pendingRequestCount(page)).toBe(1);
		await expect(escapeHatch(page)).toBeVisible();
		expect(await wouldBlockUnload(page)).toBe(true);

		// The user locks their wallet. It is still holding the transaction, exactly
		// as a real one would be.
		await lockStallingWallet(page);
		await expect
			.poll(() => walletStatus(page), {timeout: 15_000})
			.toBe('locked');

		// And wallet state is rebuilt under the request, which IS the transition.
		//
		// `unlock()`, because it is the ONE route through this transition that every
		// app in this tree actually has.
		//
		// BE PRECISE ABOUT WHAT THIS DOES AND DOES NOT COVER. `unlock()` publishes
		// through `onAccountChanged`, which spreads the existing wallet forward, so
		// it exercises the announcement surviving a wallet-state CHANGE - not the
		// from-scratch `wallet: {...}` construction that erased the list in 0.10.0.
		// The next test drives that, by answering the picker; this comment used to
		// claim it happened here, which was wrong and is the sort of confident,
		// specific, false sentence this file keeps having to apologise for.
		//
		// This used to be a bare `ensureConnected()`, and that only worked here by
		// accident of configuration. `ensureConnected` promises the app's TARGET
		// step, and upstream treats a locked wallet as failing that target only when
		// the target is `WalletConnected` (ADR-0002): a SIGNED-IN app acts through
		// its session account, which a locked wallet does not invalidate, so there
		// the call correctly finds the target already reached and reconnects
		// nothing. Every descendant that signs in therefore inherited a test that
		// waited 30 seconds for a status that was never coming - which `bleeps` and
		// `mandalas` each diagnosed and patched locally, in the same way, because
		// the template gave them no version that worked.
		//
		// Naming a wallet mechanism instead (`ensureConnected('WalletConnected',
		// {type: 'wallet', address})`) does force the reconnect, and is wrong for a
		// different reason: from a signed-in state it routes through `connect()` and
		// opens the WALLET PICKER, which nobody in this test is there to answer. The
		// picker is the next test's subject, not this one's.
		//
		// `unlock()` is what this app puts in front of the user in exactly this
		// state (see `walletPromptCopy`: "Your wallet is locked ... Unlock it to see
		// the request"), it moves wallet state under the parked request, and it keeps
		// the step, the account and the wallet where re-running the flow would
		// rebuild all three. The next test covers both harsher cases: a state with NO
		// wallet at all, and the wallet being BUILT again underneath the request.
		await page.evaluate(() => (globalThis as any).context.connection.unlock());
		await expect
			.poll(() => walletStatus(page), {timeout: 30_000})
			.toBe('connected');

		// Nothing was withdrawn: the wallet still has it.
		expect(await isHoldingTransaction(page)).toBe(true);

		// FIRST, THE LIBRARY'S OWN ANSWER, because it is the one that regressed and
		// it fails with a readable number rather than "element not found". Pinning
		// @etherplay/connect back to 0.7.1 turns this into `expected 1, received 0`.
		// It is also the reason this test is not merely re-testing the app's ledger,
		// which would hold all three affordances below up on its own and hide an
		// upstream regression completely.
		expect(await pendingRequestCount(page)).toBe(1);

		// THEN ALL THREE STAY UP. Every one of them used to go silent here, which
		// left the user holding a wallet popup the app believed did not exist, with
		// no explanation, no exit, and no warning before a reload threw the answer
		// away.
		//
		// The modal is matched on the TRANSACTION wording, which makes this stricter
		// than "a modal is up": with the list erased, the app still blocks on the
		// strength of its own dispatch but says "Getting your transaction ready"
		// instead, because an empty list can no longer be read as a wallet request
		// (see `walletPromptCopy`). So this asserts the app is speaking for the
		// WALLET, which it may only do when the wallet really is holding something.
		await expect(waitingModal(page)).toBeVisible();
		await expect(escapeHatch(page)).toBeVisible();
		expect(await wouldBlockUnload(page)).toBe(true);

		// AND THEY STILL GO AWAY WHEN THE WALLET ANSWERS. A modal that never closes
		// is a worse bug than the one being fixed, and "copy the live list at every
		// rebuild" is exactly the shape of change that could strand one.
		await approveHeldTransaction(page);

		await expect(waitingModal(page)).toHaveCount(0, {timeout: 30_000});
		await expect
			.poll(() => pendingRequestCount(page), {timeout: 30_000})
			.toBe(0);
		await expect
			.poll(() => wouldBlockUnload(page), {timeout: 30_000})
			.toBe(false);

		// And it really landed, from the account it started under.
		await expect
			.poll(() => sentHashes(page), {timeout: 30_000})
			.toHaveLength(1);
	});

	test('keeps announcing a request through a state with NO wallet', async ({
		page,
	}) => {
		// THE SECOND HOLE, closed by @etherplay/connect 0.11.0, and the reason the
		// list no longer lives on the wallet object.
		//
		// 0.10.0's rule was "copy the live list at every `wallet: {...}` rebuild",
		// which does nothing for the paths that build NO wallet: a failed reconnect,
		// a mechanism picker, and this one. The list survived inside the provider
		// wrapper and there was simply nowhere left to read it from. 0.11.0 moved
		// `pendingRequests` up beside `wallet` and stamps it on every publish, so a
		// state with no wallet still reports what the user's wallet is holding.
		//
		// Driven through `connect()` on a locked wallet, which is NOT a bug and was
		// reported as one from here. It opens the wallet picker, because `connect`
		// means "the user wants to connect something" while `ensureConnected` promises
		// a target; the picker drops the wallet, which is its contract. That is
		// reachable in this app today, since the navbar's Connect button is
		// `connection.connect()`. What made it look destructive was this hole, not the
		// asymmetry: the teardown also erased the announcement. Now it costs a click.
		await sendAndStall(page, ADDRESSES.noWallet);
		expect(await pendingRequestCount(page)).toBe(1);

		await lockStallingWallet(page);
		await expect
			.poll(() => walletStatus(page), {timeout: 15_000})
			.toBe('locked');

		await page.evaluate(() => (globalThis as any).context.connection.connect());

		// The flow comes to rest in a PICKER, showing NO wallet at all. That is the
		// state the announcement used to disappear in, so it is asserted rather than
		// assumed: without it this test would silently become a second copy of the
		// one above.
		//
		// WHICH picker is the app's business, and naming one was this file's third
		// version of the same mistake (see `stepBefore` and `stepBeforeLock` above,
		// captured rather than named for exactly this reason). `connect()` opens the
		// choice the app actually offers: `WalletToChoose` where wallets are the only
		// way in, `MechanismToChoose` where the app also offers email or social
		// sign-in. Both are the same fact for this test - the flow is at rest, on a
		// choice, holding no wallet - and a descendant that offers more than wallets
		// was failing on the name of its own picker.
		await expect
			.poll(
				() =>
					page.evaluate(() => {
						const c = (globalThis as any).get(
							(globalThis as any).context.connection,
						);
						return {step: c.step, hasWallet: !!c.wallet};
					}),
				{timeout: 30_000},
			)
			.toEqual({
				step: expect.stringMatching(/^(WalletToChoose|MechanismToChoose)$/),
				hasWallet: false,
			});

		// The wallet is still holding it, and the app can still say so.
		expect(await isHoldingTransaction(page)).toBe(true);
		expect(await pendingRequestCount(page)).toBe(1);
		await expect(waitingModal(page)).toBeVisible();
		await expect(escapeHatch(page)).toBeVisible();
		expect(await wouldBlockUnload(page)).toBe(true);

		// AND THROUGH THE REBUILD ON THE WAY BACK, which is the transition that
		// actually regressed and the only place this suite still drives it.
		//
		// Everything above happens while wallet state is being TORN DOWN or spread
		// forward. The 0.10.0 bug was in neither: it was in the nine places that
		// BUILD a `wallet: {...}` from scratch, each of which asserted
		// `pendingRequests: []` and so erased an outstanding request permanently.
		// `unlock()` in the test above cannot catch that - upstream's own fix note
		// says the event handlers "spread the existing wallet state and so preserve
		// the list" - and neither can resting in a picker. Answering the picker is
		// what constructs a wallet again, under a request the user's wallet is still
		// holding, which is exactly the shape that lost it.
		//
		// So the number below is the one that was 0. Reverting @etherplay/connect's
		// central stamp turns this line, and only this line, back into
		// `expected 1, received 0`.
		//
		// Driven as the picker's own `onclick` rather than by clicking the picker,
		// which cannot be clicked from here and should not be: the wallet-action
		// modal is a SYSTEM-layer overlay sitting above it, so the click is
		// intercepted by the very modal this test is asserting stays up. That is the
		// app behaving correctly - it is still demanding an answer for a request the
		// wallet holds - so the test reaches past the z-order to the same call the
		// row makes (ConnectionFlow.svelte: `connect({type: 'wallet', name})`),
		// exactly as it already reaches past it for `connect()` above.
		await page.evaluate(
			(name) =>
				(globalThis as any).context.connection.connect({type: 'wallet', name}),
			STALLING_WALLET_NAME,
		);
		await expect
			.poll(() => walletStatus(page), {timeout: 30_000})
			.toBe('connected');
		await expect
			.poll(() => pendingRequestCount(page), {timeout: 15_000})
			.toBe(1);
		expect(await isHoldingTransaction(page)).toBe(true);

		// And it still clears when the wallet answers, having lost and regained its
		// wallet in between.
		await approveHeldTransaction(page);
		await expect
			.poll(() => pendingRequestCount(page), {timeout: 30_000})
			.toBe(0);
		await expect(waitingModal(page)).toHaveCount(0, {timeout: 30_000});
		await expect
			.poll(() => sentHashes(page), {timeout: 30_000})
			.toHaveLength(1);
	});

	test('offers Unlock, and says so, when the wallet has gone to sleep', async ({
		page,
	}) => {
		// A LOCKED WALLET IS NOT SHOWING THE USER THE REQUEST, so telling them to
		// approve it there is a false instruction in the most literal way available.
		//
		// Measured before this existed, in exactly this state: the modal said
		// "Confirm the transaction in your wallet", the navbar showed `~10000 ETH`,
		// and the only buttons on the page were Send and Stop waiting. Locking keeps
		// `step: 'WalletConnected'`, so every `isTargetStepReached` branch rendered a
		// wallet that was refusing everything as a working one, and the app's only
		// suggestion was to give up.
		await sendAndStall(page, ADDRESSES.locked);
		// Captured rather than named. The claim is that `unlock()` KEEPS the step
		// where re-running the flow would rebuild it, and which step that is depends
		// on the app's target: `SignedIn` here, `WalletConnected` in the template.
		// This app is the sibling that found the hard-coded version.
		const stepBeforeLock = await page.evaluate(
			() =>
				(globalThis as any).get((globalThis as any).context.connection).step,
		);
		await lockStallingWallet(page);

		// The words change, and they change to the truth.
		const lockedModal = dialog(page, 'Your wallet is locked');
		await expect(lockedModal).toBeVisible({timeout: 15_000});
		await expect(lockedModal).toContainText('still there waiting');
		// It must NOT still be telling them to go and approve it.
		await expect(waitingModal(page)).toHaveCount(0);

		// The remedy is on screen, where the user is stuck.
		await expect(
			lockedModal.getByRole('button', {name: 'Unlock'}),
		).toBeVisible();

		// AND NOWHERE ELSE, which is the decision rather than an omission. A wallet
		// prompts for its password ON DEMAND, so chrome that sprouts an Unlock button
		// whenever a wallet auto-locks on a timer is noise about a state that resolves
		// itself the next time anything needs signing. The bar keeps showing the
		// account, which is still connected and whose balance is read through the
		// always-on provider rather than the wallet: only signing is asleep.
		//
		// Asserted because the opposite was built first and looked reasonable. Without
		// this, the next reader finds `walletLockState` used only by the modal and
		// helpfully wires it up here too.
		//
		// Asserted on `data-connected` and the ABSENCE of the button, rather than on
		// whatever the bar happens to render. A descendant showed `Needs funds` there
		// instead of a balance and failed this on a presentation detail that has
		// nothing to do with the decision being pinned. What every app in this tree
		// agrees on is that a locked wallet still reads as connected here and grows no
		// remedy of its own.
		const bar = page.getByTestId('wallet-status');
		await expect(bar.getByRole('button', {name: 'Unlock'})).toHaveCount(0);
		await expect(bar).toHaveAttribute('data-connected', 'true');

		// Nothing was withdrawn while the wallet slept, which is the promise the
		// copy makes: the request is still announced and still guarded.
		expect(await pendingRequestCount(page)).toBe(1);
		expect(await isHoldingTransaction(page)).toBe(true);
		expect(await wouldBlockUnload(page)).toBe(true);
		await expect(escapeHatch(page)).toHaveCount(0);
		await expect(
			lockedModal.getByRole('button', {name: 'Stop waiting'}),
		).toBeVisible();

		// And it WORKS, rather than merely being present. `unlock()` keeps the step,
		// the account and the wallet, where `connect()` would open the picker and
		// rebuild all three.
		await lockedModal.getByRole('button', {name: 'Unlock'}).click();
		await expect
			.poll(() => walletStatus(page), {timeout: 30_000})
			.toBe('connected');
		await expect(waitingModal(page)).toBeVisible({timeout: 15_000});
		expect(await pendingRequestCount(page)).toBe(1);

		// The account survived the round trip, which is the point of using unlock.
		expect(
			await page.evaluate(
				() =>
					(globalThis as any).get((globalThis as any).context.connection).step,
			),
		).toBe(stepBeforeLock);

		await approveHeldTransaction(page);
		await expect
			.poll(() => sentHashes(page), {timeout: 30_000})
			.toHaveLength(1);
	});

	test('records the transaction when the user approves it later', async ({
		page,
	}) => {
		// The promise the escape hatch makes, kept: "if you approve it later, it
		// will still be sent". The app has to still be there to notice.
		await sendAndStall(page, ADDRESSES.approvedLater);
		await stopWaiting(page);

		await approveHeldTransaction(page);

		const [hash] = await expect
			.poll(() => sentHashes(page), {timeout: 30_000})
			.toHaveLength(1)
			.then(() => sentHashes(page));

		// Recorded as an operation, exactly as if nobody had stopped waiting.
		await expect
			.poll(
				() =>
					page.evaluate(() =>
						Object.values(
							(globalThis as any).get(
								(globalThis as any).context.accountData.watchField(
									'operations',
								),
							),
						).map((op: any) => op.attempts[0]?.hash),
					),
				{timeout: 30_000},
			)
			.toContain(hash);

		// No error about a transaction that succeeded, and nothing left in the
		// ledger to warn about.
		await expect(dialog(page, 'Transaction error')).toHaveCount(0);
		await expect
			.poll(
				() =>
					page.evaluate(
						() =>
							(globalThis as any).get((globalThis as any).context.inFlight)
								.requests.length,
					),
				{timeout: 30_000},
			)
			.toBe(0);

		// And nothing is claimed about a transaction the app watched land.
		await expect(dialog(page, 'may have been sent')).toHaveCount(0);
	});
});

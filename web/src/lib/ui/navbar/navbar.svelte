<script lang="ts">
	import {getAppContext, route} from '$lib';
	import Button, {buttonVariants} from '$lib/shadcn/ui/button/button.svelte';
	import EthereumAvatar from '../../core/ui/ethereum/EthereumAvatar.svelte';
	import {Spinner} from '$lib/shadcn/ui/spinner/index.js';
	import * as Drawer from '$lib/shadcn/ui/drawer/index.js';
	import * as Collapsible from '$lib/shadcn/ui/collapsible/index.js';
	import * as Popover from '$lib/shadcn/ui/popover/index.js';
	import Address from '../../core/ui/ethereum/Address.svelte';
	import Badge from '$lib/shadcn/ui/badge/badge.svelte';
	import {formatBalance} from '$lib/core/utils/format/balance';
	import {countPendingOperations} from '$lib/view/operation';
	import {createSendingPulse} from '$lib/ui/in-flight/sending';
	import {effectiveGasPrice} from '$lib/core/connection/gasFee';
	import {FaucetButton, hasFaucet} from '$lib/core/ui/faucet/index.js';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import {NAV_LINKS} from '$lib/navigation';
	import {navbarMenuPrompt} from './overlays';

	let {
		currentPath,
	}: {
		/**
		 * The path being shown, as a GETTER so reading it here tracks the caller's
		 * reactive source. Passed in rather than read from the router, so the navbar
		 * does not name the framework (src/lib/kit/README.md), and so it still
		 * highlights the right link during SSR, when the navigation service is
		 * deliberately inert.
		 *
		 * `repoURL` and `communityURL`, which upstream also declares here, are
		 * deliberately absent: this bar is a measured tab row with no room for the
		 * two icon links, and Bleeps already publishes its repository, Discord and
		 * Twitter from the footer (see lib/mainnet.ts). Declaring props this
		 * component then ignores would be a false contract.
		 */
		currentPath: () => string;
	} = $props();

	/**
	 * Which destinations exist is decided by what this build was built against
	 * (lib/navigation.ts). Whether they all FIT is measured, here.
	 *
	 * It has to be measured rather than pinned to a breakpoint, because both
	 * sides of the bar move: a mainnet build has four tabs and a demo build six,
	 * the tabs' padding changes at `sm`, and the right-hand side is a Connect
	 * button, or a balance and an avatar, or an avatar on its own. Every static
	 * rule I tried was wrong somewhere: four tabs overlapped Connect below 362px,
	 * and six overlapped it at exactly 640px, where the padding grows at the same
	 * breakpoint the folding stopped.
	 *
	 * Where they do not all fit, the bar shows the tab you are on and `More`
	 * holds the rest. They stay in the TAB BAR, where navigation belongs: the
	 * button beside it is the wallet, and it becomes an account avatar once you
	 * connect, which is the wrong place to hide pages.
	 */
	let moreOpen = $state(false);

	let navElement = $state<HTMLElement | undefined>(undefined);
	/** The hidden copy of every tab, which is what gets measured. */
	let measuringElement = $state<HTMLElement | undefined>(undefined);
	let accountElement = $state<HTMLElement | undefined>(undefined);

	/**
	 * Starts as "they fit", because that is right on a desktop, which is where a
	 * prerendered page is most often first painted; the measurement corrects it
	 * before the browser paints anything on a phone.
	 */
	let showsEveryTab = $state(true);

	/** Room for the gap between the two halves, and a little either way. */
	const BREATHING_ROOM = 24;

	function measureTabs() {
		if (!navElement || !measuringElement || !accountElement) {
			return;
		}
		const available =
			navElement.clientWidth - accountElement.offsetWidth - BREATHING_ROOM;
		showsEveryTab = measuringElement.scrollWidth <= available;
	}

	$effect(() => {
		if (!navElement || !accountElement) {
			return;
		}
		measureTabs();
		// The bar resizes with the window; the account side also resizes on its own
		// when a wallet connects and a balance appears where a button was.
		const observer = new ResizeObserver(measureTabs);
		observer.observe(navElement);
		observer.observe(accountElement);
		// Tab widths change when the webfont lands, which is after the first paint.
		void document.fonts?.ready.then(measureTabs);
		return () => observer.disconnect();
	});

	const {
		connection,
		accountData,
		accountBalance,
		gasFee,
		clock,
		deployments,
		overlays,
		inFlight,
	} = getAppContext();

	// A transaction being handed over RIGHT NOW, which is the window before it
	// becomes an operation the badge below can count. Wordless and immediate on
	// purpose: see the two-surface note in $lib/ui/in-flight/sending.ts. This is
	// the rung that is on screen whenever the unload guard is armed, so it must
	// not be delayed AND must not be hidden by a connection step: it is rendered
	// outside the connected/disconnected branch below for that reason.
	const sending = createSendingPulse(inFlight);

	// The drawer closes itself on any navigation, and the back gesture closes it,
	// because it is a registered view overlay. Nav links below therefore carry no
	// close handler of their own.
	const menu = overlays.use(navbarMenuPrompt);
	$effect(() => menu.registerRenderer());

	let accountsOpen = $state(false);

	let hasMultipleAccounts = $derived(
		$connection.wallet?.accounts && $connection.wallet.accounts.length > 1,
	);

	// Watch all operations; the pending-badge counting rule lives in the view helper.
	let operations = $derived(accountData.watchField('operations'));
	let transactionCount = $derived(countPendingOperations($operations));

	// A LOCKED WALLET STILL RENDERS AS CONNECTED HERE, and that is a decision
	// rather than the oversight it looks like.
	//
	// Locking keeps `step: 'WalletConnected'`, so every `isTargetStepReached`
	// branch below treats it as connected, and everything they show is still TRUE:
	// the account is connected, the address is right, and the balance is read
	// through the always-on provider rather than the wallet. Only SIGNING is
	// asleep.
	//
	// An "Unlock" button was built here and taken out again. A wallet prompts for
	// its password ON DEMAND, exactly when something needs signing, so an app-side
	// button duplicates a thing the wallet already does better and at a better
	// moment, while a chrome that changes shape whenever a wallet auto-locks on a
	// timer is noise about a state that resolves itself.
	//
	// The case that does NOT resolve itself is a request made BEFORE the lock: the
	// wallet is then sitting on it behind a password screen with nothing to
	// re-surface it. That is a modal, not chrome, and it is handled where the user
	// is actually stuck, by `walletPromptCopy` and `WalletActivity.unlockable` in
	// core/connection/wallet-activity. `e2e/tests/escape-hatch.e2e.ts` asserts this
	// bar keeps showing the balance in that state, so the decision is pinned rather
	// than rediscovered.

	// Derive formatted balance
	let formattedBalance = $derived.by(() => {
		if ($accountBalance.step === 'Loaded') {
			return formatBalance($accountBalance.value, 18, 6);
		}
		return null;
	});

	// Balance status store
	const balanceStatus = accountBalance.status;

	// Format time ago for stale indicator (reactive to clock store)
	function formatTimeAgo(timestamp: number): string {
		const seconds = Math.floor(($clock - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ago`;
	}

	// Gas fee store and status
	const gasFeeStatus = gasFee.status;

	// Format effective gas price in gwei (9 decimals).
	let formattedGasPrice = $derived.by(() => {
		if ($gasFee.step === 'Loaded') {
			return formatBalance(effectiveGasPrice($gasFee), 9, 6);
		}
		return null;
	});

	function toggleMenu() {
		if ($menu.open) menu.close();
		else menu.open();
	}

	function isActive(path: string): boolean {
		const here = currentPath();
		if (path === '/') {
			return here === '/';
		}
		return here.startsWith(path);
	}
</script>

<!--navbar padding handled by scrollbar-gutter on desktop, needs-gutter-padding class adds padding on touch devices, see app.css-->
<!--
	The tab bar is the pre-template site's: a rule in the Bleeps colour across the
	whole bar, and the current page drawn as a tab sitting on top of it.

	`fixed`, NOT `sticky`, and the height shell in `+layout.svelte` is the reason.
	A sticky element can only stay pinned while its containing block is on screen,
	and the shell is exactly `100dvh` tall, so a sticky navbar's travel runs out
	after `100dvh - var(--navbar-height)` of scroll. Any page that can scroll
	further than that scrolled the navigation off the top and left the user with
	no way back. Out of flow, there is no containing block to run out of. This
	arrived with the shell: before it, `sticky` here was correct.

	The shell reserves the space with `pt-[var(--navbar-height)]`, so the height
	below is that same variable rather than a second hardcoded number. The bar
	keeps its own look (the Bleeps rule, `items-end` so the tabs sit ON it); only
	the positioning and the height contract come from upstream.

	Two things it has to survive that the original did not: six destinations
	instead of three, and a phone. The account cluster never shrinks (`shrink-0`)
	and the tab row can (`min-w-0`), so the wallet cannot be pushed off the edge,
	and the tabs fold into `More` when they do not fit.
-->
<!-- `data-app-navbar` is the shell's contract, not decoration: it names the
     element that IS the fixed chrome, whatever tag an app chooses for it. See
     the `navbar` prop in core/ui/AppShell.svelte. A descendant that replaces
     this file keeps the attribute on its own root. -->
<nav
	bind:this={navElement}
	data-app-navbar
	class="needs-gutter-padding fixed top-0 left-0 z-50 flex h-[var(--navbar-height)] w-full items-end gap-2 border-b border-bleeps bg-background pt-1"
>
	<!-- Every tab, laid out but not shown, so the width they WOULD take can be
	     measured whatever the bar is currently showing. Without it the decision
	     would feed on its own output: fold, become narrower, decide it fits,
	     unfold, overflow, fold again. -->
	<ul
		bind:this={measuringElement}
		aria-hidden="true"
		class="pointer-events-none invisible absolute top-0 left-0 flex items-end pl-2 whitespace-nowrap"
	>
		{#each NAV_LINKS as link (link.href)}
			<li class="mr-1 shrink-0">
				<span
					class="inline-block border-t border-r border-l border-transparent px-3 py-2 text-sm font-semibold sm:text-base"
					>{link.title}</span
				>
			</li>
		{/each}
	</ul>

	<!-- The small indent is the pre-template site's: it leaves a run of the rule
	     showing before the first tab, so the bar starts as a line rather than as
	     a box. The measuring copy carries it too, or the fit maths would be out
	     by its width. -->
	<ul class="flex min-w-0 flex-1 items-end pl-2">
		{#each NAV_LINKS as link (link.href)}
			<!-- Where the tabs do not all fit, a row that scrolls sideways reads as a
			     mistake rather than an affordance, and one that overlaps the Connect
			     button reads as a bug. So the bar keeps the tab that says where you
			     are and `More` carries the rest. -->
			<li
				class="mr-1 shrink-0 {showsEveryTab || isActive(link.href)
					? 'block'
					: 'hidden'}"
			>
				{#if isActive(link.href)}
					<!-- The current tab is the ONLY thing that interrupts the rule: it
					     hangs a pixel below its row and paints its own background over
					     the line. Every other tab leaves the rule alone, which is what
					     makes this read as a tab bar rather than a row of boxes. -->
					<span
						class="-mb-px inline-block rounded-t border-t border-r border-l border-bleeps bg-background px-3 py-2 text-sm font-semibold text-bleeps sm:text-base"
						aria-current="page"
					>
						{link.title}
					</span>
				{:else}
					<a
						href={route(link.href)}
						class="inline-block px-3 py-2 text-sm font-semibold text-bleeps hover:underline sm:text-base"
					>
						{link.title}
					</a>
				{/if}
			</li>
		{/each}

		<!-- Only when the tabs do not all fit, which is measured rather than
		     guessed at a breakpoint: the right-hand side is a Connect button, or a
		     balance, or an avatar on its own, and the answer differs for each.

		     It says `More` rather than `...` because a row of dots is a shrug: it
		     tells you something is hidden without telling you it is the rest of the
		     site. The chevron says it opens rather than navigates. -->
		<li class="mr-1 shrink-0" class:hidden={showsEveryTab}>
			<Popover.Root bind:open={moreOpen}>
				<Popover.Trigger
					class="inline-flex items-center gap-1 px-2 py-2 text-sm font-semibold text-bleeps hover:underline"
					aria-label="More pages"
				>
					More
					<ChevronDownIcon
						class="h-3 w-3 transition-transform {moreOpen ? 'rotate-180' : ''}"
					/>
				</Popover.Trigger>
				<Popover.Content
					align="start"
					sideOffset={0}
					class="w-44 gap-0 rounded-none border border-bleeps bg-background p-0"
				>
					<!-- What the bar is not showing: every page but the one you are on. -->
					{#each NAV_LINKS as link (link.href)}
						{#if !isActive(link.href)}
							<a
								href={route(link.href)}
								class="block px-4 py-2 text-sm font-semibold text-bleeps hover:underline"
								onclick={() => (moreOpen = false)}
							>
								{link.title}
							</a>
						{/if}
					{/each}
				</Popover.Content>
			</Popover.Root>
		</li>
	</ul>

	<!-- `data-connected` is the single authoritative connection signal for e2e.
	     Inferring it from the balance text below does not work: that span renders
	     EMPTY while the balance loads and is hidden under the `sm` breakpoint, so
	     a connected app reads as disconnected. It tracks the same predicate the
	     branches below use and is always in the DOM. -->
	<div
		bind:this={accountElement}
		class="flex shrink-0 items-center space-x-2 pb-1"
		data-testid="wallet-status"
		data-connected={connection.isTargetStepReached($connection)}
	>
		<!-- Connect Button / Connected Address -->
		{#if ($connection.step === 'Idle' && $connection.loading) || ($connection.step != 'Idle' && !connection.isTargetStepReached($connection))}
			<Button disabled class="flex h-8 items-center justify-center p-0 px-3">
				<Spinner /> Connect
			</Button>
		{:else if connection.isTargetStepReached($connection)}
			<div class="hidden h-8 items-center space-x-2 sm:flex">
				{#if $balanceStatus.error && formattedBalance !== null}
					<span class="flex items-center gap-1 text-sm text-muted-foreground">
						<AlertCircleIcon class="h-3 w-3 text-amber-500" />
						{formattedBalance}
						{$deployments.chain.nativeCurrency.symbol}
					</span>
				{:else if formattedBalance !== null}
					<span class="text-sm text-muted-foreground"
						>{formattedBalance}
						{$deployments.chain.nativeCurrency.symbol}</span
					>
				{:else if $balanceStatus.error}
					<span class="flex items-center gap-1 text-sm text-destructive">
						<AlertCircleIcon class="h-3 w-3" />
						Balance error
					</span>
				{/if}
			</div>
		{:else}
			<Button
				class="flex h-8 items-center justify-center p-0 px-3"
				onclick={() => connection.connect()}
			>
				Connect
			</Button>
		{/if}

		<!-- Drawer Button - Avatar when connected, Menu icon when disconnected -->
		<button
			class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md focus:outline-none {$connection.step !==
			'SignedIn'
				? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
				: ''}"
			onclick={toggleMenu}
			aria-label="Open menu"
		>
			{#if connection.isTargetStepReached($connection)}
				<EthereumAvatar address={$connection.account.address} />
				{#if transactionCount > 0}
					<!-- Rendered only while operations are in flight, so its absence
					     is the app's own "everything has settled" signal. Tests wait
					     on this rather than on any one feature's pending marker.

					     It PULSES while another transaction is being handed over, so
					     the count and the "one more on its way" are one mark rather
					     than two competing ones. Class only: the element, its testid
					     and its count are untouched by the animation. -->
					<span
						data-testid="pending-operations"
						data-count={transactionCount}
						class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground {$sending.sending
							? 'animate-pulse ring-2 ring-primary/50'
							: ''}"
					>
						{transactionCount > 99 ? '99+' : transactionCount}
					</span>
				{/if}
			{:else}
				<MenuIcon class="h-5 w-5" />
			{/if}

			{#if $sending.sending && transactionCount === 0}
				<!-- The same corner as the badge, before there is anything to count: a
				     transaction is on its way and has not become an operation yet. It
				     becomes the badge the moment it does, so the mark grows into a
				     number rather than one thing replacing another.

				     OUTSIDE the connected branch, unlike the badge. A dispatch can
				     outlive the step that started it (a wallet locking rebuilds its
				     state), and this is the rung sending.ts promises is up whenever the
				     unload guard is armed. Rendered inside, that promise would quietly
				     be "whenever the account button happens to be showing", and the
				     browser would ask about leaving with nothing at all on screen.

				     A SEPARATE testid, deliberately. `pending-operations` means "the
				     app is tracking N operations" and the e2e suite waits for it to
				     reach zero to mean settled (see e2e/fixtures/test.ts). Reusing it
				     for a dispatch with nothing recorded yet would make that wait
				     answer a different question.

				     `aria-hidden`, because the ordinary case is over in a few hundred
				     milliseconds and announcing every one of those is noise. That does
				     mean a screen reader gets NOTHING for a quick dispatch, not a
				     quieter version of it; the concession is spelled out in
				     $lib/ui/in-flight/sending.ts. -->
				<span
					data-testid="sending-transaction"
					aria-hidden="true"
					class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center"
				>
					<span
						class="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-primary opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"
					></span>
				</span>
			{/if}
		</button>
	</div>
	<Drawer.Root
		open={$menu.open}
		onOpenChange={(open) => {
			if (!open) menu.close();
		}}
		direction="right"
	>
		<!-- Lands in the drawer layer, which is Drawer.Content's own default (see
		     lib/core/ui/layers.ts). That is what keeps the modals this panel opens
		     ABOVE the panel itself. The target has to be on Content, which supplies
		     its own portal: a bare `<Drawer.Portal to="..." />` sibling has no
		     children and silently does nothing, which is what once put this drawer
		     on top of every modal. -->
		<Drawer.Content class="select-text **:select-text">
			{#if connection.isTargetStepReached($connection)}
				<!-- Account Section -->
				<div class="flex flex-col gap-2 px-4 pt-4">
					<Collapsible.Root
						bind:open={accountsOpen}
						disabled={!hasMultipleAccounts}
					>
						<Collapsible.Trigger class="w-full" disabled={!hasMultipleAccounts}>
							<div
								class="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 {hasMultipleAccounts
									? 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
									: 'cursor-default'}"
							>
								<div class="flex items-center gap-2">
									<div
										class="h-6 w-6 shrink-0 overflow-hidden rounded-full *:h-full *:w-full"
									>
										<EthereumAvatar address={$connection.account.address} />
									</div>
									<Address value={$connection.account.address} />
								</div>
								{#if hasMultipleAccounts}
									<ChevronDownIcon
										class="h-4 w-4 transition-transform {accountsOpen
											? 'rotate-180'
											: ''}"
									/>
								{/if}
							</div>
						</Collapsible.Trigger>
						{#if hasMultipleAccounts && $connection.wallet}
							<Collapsible.Content>
								<div
									class="mt-1 flex flex-col gap-1 rounded-md border border-input bg-muted/50 p-1"
								>
									{#each $connection.wallet.accounts as account}
										<button
											class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors {account ===
											$connection.account.address
												? 'bg-primary/20 text-primary'
												: 'hover:bg-accent hover:text-accent-foreground'}"
											onclick={() => {
												if (account !== $connection.account.address) {
													connection.connectToAddress(account);
													accountsOpen = false;
												}
											}}
										>
											<div
												class="h-5 w-5 shrink-0 overflow-hidden rounded-full *:h-full *:w-full"
											>
												<EthereumAvatar address={account} />
											</div>
											<Address value={account} />
											{#if account === $connection.account.address}
												<span class="ml-auto text-xs text-muted-foreground"
													>(current)</span
												>
											{/if}
										</button>
									{/each}
								</div>
							</Collapsible.Content>
						{/if}
					</Collapsible.Root>

					<Button
						class="w-full"
						variant="destructive"
						onclick={() => {
							connection.disconnect();
							menu.close();
						}}
					>
						Disconnect
					</Button>
				</div>

				<!-- Balance & Transactions Section -->
				<div class="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
					<div class="flex flex-col gap-1 rounded-md bg-muted/50 px-3 py-2">
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground">Balance</span>
							{#if $balanceStatus.loading && formattedBalance === null}
								<Spinner class="h-4 w-4" />
							{:else if formattedBalance !== null}
								<span class="font-medium"
									>{formattedBalance}
									{$deployments.chain.nativeCurrency.symbol}</span
								>
							{:else if $balanceStatus.error}
								<span class="text-sm text-destructive">Failed to load</span>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						</div>

						{#if $balanceStatus.error}
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-1 text-xs text-destructive">
									<AlertCircleIcon class="h-3 w-3" />
									{#if $balanceStatus.lastSuccessfulFetch}
										Stale — updated {formatTimeAgo(
											$balanceStatus.lastSuccessfulFetch,
										)}
									{:else}
										Unable to fetch balance
									{/if}
								</span>
								<button
									class="flex items-center gap-1 text-xs text-primary hover:underline"
									onclick={() => accountBalance.update()}
								>
									<RefreshCwIcon class="h-3 w-3" />
									Retry
								</button>
							</div>
						{/if}

						{#if hasFaucet && $accountBalance.step === 'Loaded' && $accountBalance.value === 0n}
							<FaucetButton />
						{/if}
					</div>

					<a
						href={route('/transactions/')}
						class="{buttonVariants({variant: 'outline'})} justify-between"
					>
						<span>Your Transactions</span>
						{#if transactionCount > 0}
							<Badge variant="secondary" class="ml-2">{transactionCount}</Badge>
						{/if}
					</a>
				</div>
			{:else}
				<Drawer.Header class="text-start">
					<Drawer.Title>You are disconnected</Drawer.Title>
				</Drawer.Header>
				<div class="px-4">
					<Button class="w-full" onclick={() => connection.connect()}>
						Connect
					</Button>
				</div>
			{/if}

			<!-- Network Info -->
			<div class="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
				<span class="text-xs tracking-wide text-muted-foreground uppercase"
					>Network</span
				>
				<div
					class="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
				>
					<span class="text-sm text-muted-foreground">Gas Price</span>
					{#if $gasFeeStatus.loading && formattedGasPrice === null}
						<Spinner class="h-4 w-4" />
					{:else if formattedGasPrice !== null}
						<span class="font-medium">{formattedGasPrice} gwei</span>
					{:else if $gasFeeStatus.error}
						<span class="text-sm text-destructive">unavailable</span>
					{:else}
						<span class="text-sm text-muted-foreground">—</span>
					{/if}
				</div>
			</div>

			<!-- Developer Links -->
			<div class="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
				<span class="text-xs tracking-wide text-muted-foreground uppercase"
					>Developer</span
				>
				<a
					href={route('/contracts/')}
					class={buttonVariants({variant: 'outline'})}
				>
					Contracts
				</a>
				<a
					href={route('/explorer/')}
					class={buttonVariants({variant: 'outline'})}
				>
					Explorer
				</a>
			</div>

			<Drawer.Footer class="pt-2">
				<Drawer.Close class={buttonVariants({variant: 'outline'})}
					>Cancel</Drawer.Close
				>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
</nav>

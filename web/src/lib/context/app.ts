import {
	createOnchainState,
	type OnchainStateStore,
} from '$lib/onchain/state.js';
import {createViewState, type ViewStateStore} from '$lib/view/index.js';
import {saleDeployment} from '$lib/sale/deployment.js';
import type {TypedDeployments} from '$lib/deployments-store.js';
import type {CoreServices} from './core.js';

/**
 * THIS APP'S HALF OF THE CONTEXT. The part a fork replaces.
 *
 * `./core.ts` composes everything that is true of any app built on the
 * jolly-roger template: the connection, the executors, balances, transaction
 * observation, navigation and overlays. This file is Bleeps, and it is the only
 * one of the two that diverges from upstream on purpose.
 *
 * WHY THE SPLIT EXISTS, which is not tidiness. `core.ts` is merged down from
 * jolly-roger forever, so it wants to differ as little as possible; this file is
 * REPLACED, so it wants to be separable. Keeping both in one function meant
 * every merge had to tell the two apart line by line inside an 800-line
 * composition, which is exactly where the recorded conflicts landed.
 *
 * CORE BUILDS THIS, not the other way round, and the order is the reason.
 * `core.ts` calls the factory partway through its own construction, because the
 * app needs the connection and accountData, and core's refresh wiring and RPC
 * health then need the app's chain reads. Two passes in one direction, rather
 * than a cycle. See the injection point in `core.ts`.
 *
 * REACHED THROUGH THE `$app-specific` ALIAS, never by path (see svelte.config.js).
 * The framework imports `$app-specific`, so an app whose half lives elsewhere (a
 * game keeps it beside its own code) points the alias there and no framework
 * file is edited. What the alias must provide is what this module exports:
 * `createAppContext`, `AppMembers` and `operationScope`.
 */
export function createAppContext(core: CoreServices): AppMembers {
	const {publicClient, deployments, accountData, chainFetchGate} = core;

	// Bleeps derives nothing chain-specific yet: the onchain read takes its
	// polling defaults. Kept as a named value rather than inlined so the app has
	// one place to grow its own configuration, the way `config.ts` grows core's.
	const config = {};

	const onchainState = createOnchainState({
		publicClient,
		deployments: deployments.get(),
		config,
		fetchGate: chainFetchGate,
	});

	const viewState = createViewState({
		onchainState,
		operations: accountData.watchField('operations'),
		// A sale contract is only deployed where a sale can still happen (dev
		// chains, and mainnet's spent one). Its presence is half of what decides
		// whether the app runs in mint or browse mode; the other half is whether
		// anything is left to buy. See lib/sale/mode.ts.
		saleDeployed: !!saleDeployment(deployments.get()),
	});

	// `config` is not returned: it is this half's own construction detail, and
	// core neither uses it nor puts it in the context.
	return {onchainState, viewState};
}

/**
 * What this app adds to the app context. `Context` (see `./types.ts`) is the
 * framework's members plus these, read through `$app-specific`, so the framework
 * names no type of this app's.
 *
 * Core reads `onchainState` for refreshes and RPC health, and states what it
 * needs of it as `AppContext`; a store that falls short is a compile error
 * where `./index.ts` hands this factory to core.
 */
export type AppMembers = {
	onchainState: OnchainStateStore;
	viewState: ViewStateStore;
};

/**
 * The address that scopes local operation data: which of this app's contracts
 * a browser's operation records belong to.
 *
 * A FUNCTION OF THE TYPED DEPLOYMENTS, not a contract name, so naming a
 * contract the deployment does not have is a compile error here, in the app,
 * rather than a lookup in the framework that answers `undefined`.
 *
 * The contract should be one whose address is stable for the deployment's
 * lifetime (e.g. the main proxy), not its implementation, which changes on
 * every hot contract replacement.
 */
export function operationScope(deployments: TypedDeployments): `0x${string}` {
	return deployments.contracts.Bleeps.address;
}

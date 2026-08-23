import {createOnchainState} from '$lib/onchain/state.js';
import {createViewState} from '$lib/view/index.js';
import {saleDeployment} from '$lib/sale/deployment.js';
import type {CoreServices, AppContext} from './core.js';

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
 */
export function createAppContext(core: CoreServices): AppContext {
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

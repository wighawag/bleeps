import type {Environment} from '../rocketh/config.js';

/**
 * The canonical WETH9 for chains where we do not deploy our own.
 *
 * MeloBleepsAuctions needs a WETH to fall back on when a refund to a bidder
 * fails. On a dev chain we deploy the mock from `src/externals/WETH9.sol`
 * (see deploy/000_externals); anywhere else there is a real one and deploying
 * a second would be wrong, since nobody else would accept it.
 */
const CANONICAL_WETH: {readonly [chainId: number]: `0x${string}`} = {
	1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // mainnet
	11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // sepolia
};

/**
 * Whether this is a throwaway chain: the local dev node, or the in-memory one
 * the tests run against.
 *
 * Used to decide whether redeploying a still-moving contract over the top of
 * the previous one is helpful (throwaway chain) or destructive (a real chain,
 * where the old deployment has users and history).
 */
export function isLocalDevChain(env: Environment): boolean {
	return env.network.chain.id === 31337;
}

/**
 * Resolve the WETH the auctions contract should use.
 *
 * Prefers a WETH we deployed ourselves (dev chains), then the canonical one for
 * the chain. Throws rather than deploying an orphan WETH or silently passing
 * the zero address, either of which would only surface much later as a failed
 * refund.
 */
export function getWETHAddress(env: Environment): `0x${string}` {
	const deployed = env.getOrNull('WETH');
	if (deployed) {
		return deployed.address;
	}

	const canonical = CANONICAL_WETH[env.network.chain.id];
	if (canonical) {
		return canonical;
	}

	throw new Error(
		`no WETH available for environment '${env.name}' (chain ${env.network.chain.id}): ` +
			`either add it to CANONICAL_WETH in deploy/utils.ts, or include 'deploy/000_externals' ` +
			`in this environment's scripts so a mock is deployed.`,
	);
}

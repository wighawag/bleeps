import {PUBLIC_USE_INTERNAL_EXPLORER} from '$env/static/public';
import {deployments, type AugmentedChainInfo} from '$lib/deployments-store';

/**
 * Get the augmented chain info from deployments
 * Uses a getter function instead of module-level constant for HMR compatibility
 */
function getChain(): AugmentedChainInfo {
	return deployments.get().chain as AugmentedChainInfo;
}

/**
 * Link destination options for address/transaction components
 */
export type LinkToOption = 'internal' | 'external' | 'both' | 'auto' | false;

/**
 * Get the block explorer URL for a transaction hash
 * Returns null if no block explorer is configured
 */
export function getBlockExplorerTxUrl(hash: string): string | null {
	const blockExplorers = getChain().blockExplorers;
	if (!blockExplorers?.default?.url) return null;
	return `${blockExplorers.default.url}/tx/${hash}`;
}

/**
 * Get the block explorer URL for an address
 * Returns null if no block explorer is configured
 */
export function getBlockExplorerAddressUrl(address: string): string | null {
	const blockExplorers = getChain().blockExplorers;
	if (!blockExplorers?.default?.url) return null;
	return `${blockExplorers.default.url}/address/${address}`;
}

/**
 * Get the block explorer name if configured
 */
export function getBlockExplorerName(): string | null {
	const blockExplorers = getChain().blockExplorers;
	return blockExplorers?.default?.name ?? null;
}

/**
 * Check if a block explorer is configured
 */
export function hasBlockExplorer(): boolean {
	const blockExplorers = getChain().blockExplorers;
	return !!blockExplorers?.default?.url;
}

/**
 * Check if internal explorer is enabled via PUBLIC_USE_INTERNAL_EXPLORER env var
 * Returns false if not set or empty
 */
export function hasInternalExplorer(): boolean {
	return PUBLIC_USE_INTERNAL_EXPLORER === 'true';
}

/**
 * Resolve 'auto' linkTo option based on available explorers
 * - If internal + external available: 'both'
 * - If only internal available: 'internal'
 * - If only external available: 'external'
 * - If neither available: false
 */
export function resolveAutoLinkTo(): 'internal' | 'external' | 'both' | false {
	const hasInternal = hasInternalExplorer();
	const hasExternal = hasBlockExplorer();

	if (hasInternal && hasExternal) return 'both';
	if (hasInternal) return 'internal';
	if (hasExternal) return 'external';
	return false;
}

/**
 * Resolve linkTo option, handling 'auto' specially
 */
export function resolveLinkTo(
	linkTo: LinkToOption,
): 'internal' | 'external' | 'both' | false {
	if (linkTo === 'auto') return resolveAutoLinkTo();
	return linkTo;
}

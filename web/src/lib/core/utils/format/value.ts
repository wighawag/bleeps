import {formatEther, formatGwei} from 'viem';

/**
 * Format a gas amount (units) with thousands separators.
 * @example formatGas(21000n) // "21,000"
 */
export function formatGas(gas: bigint): string {
	return gas.toLocaleString();
}

/**
 * Format a gas price (wei) as Gwei with a unit suffix.
 * @example formatGasPrice(1000000000n) // "1 Gwei"
 */
export function formatGasPrice(gasPrice: bigint): string {
	return `${formatGwei(gasPrice)} Gwei`;
}

/**
 * Format a wei value as ETH with a unit suffix.
 * @example formatValue(1000000000000000000n) // "1 ETH"
 */
export function formatValue(value: bigint): string {
	return `${formatEther(value)} ETH`;
}

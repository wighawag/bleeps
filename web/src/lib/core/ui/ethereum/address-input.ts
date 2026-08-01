/** Does the input look like an ENS name (known TLD suffix)? */
export function isENSName(input: string): boolean {
	return /\.(eth|xyz|luxe|kred|art|club|id|test)$/i.test(input.trim());
}

/** Is the input a complete, valid hex address? */
export function isValidHexAddress(input: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/i.test(input.trim());
}

/** Is the input a partial hex address (typing in progress)? */
export function isPartialHexAddress(input: string): boolean {
	return /^0x[a-fA-F0-9]{0,40}$/i.test(input.trim());
}

export type AddressInputClassification =
	| {kind: 'empty'}
	| {kind: 'address'; address: `0x${string}`}
	| {kind: 'partial'}
	| {kind: 'ens'; name: string}
	| {kind: 'invalid'};

/**
 * Classify raw user input into what the address input should do next.
 *
 * Pure: no ENS network access. The `ens` case still needs async resolution,
 * which the resolver hook performs.
 */
export function classifyAddressInput(raw: string): AddressInputClassification {
	const trimmed = raw.trim();
	if (!trimmed) return {kind: 'empty'};
	if (isValidHexAddress(trimmed)) {
		return {kind: 'address', address: trimmed.toLowerCase() as `0x${string}`};
	}
	if (isPartialHexAddress(trimmed)) return {kind: 'partial'};
	if (isENSName(trimmed)) return {kind: 'ens', name: trimmed};
	return {kind: 'invalid'};
}

/**
 * Formats a balance value with smart decimal handling:
 * - Always shows all digits before the decimal point
 * - Only shows decimals if needed and total symbols ≤ maxSymbols
 * - Prefixes with `~` if rounded up, `>` if rounded down (truncated)
 *
 * @param value - The raw balance as a bigint (e.g., wei for ETH)
 * @param decimals - Number of decimal places (default: 18 for ETH)
 * @param maxSymbols - Maximum total symbols to display (default: 7)
 *
 * @example
 * // For ETH (18 decimals)
 * formatBalance(9999869888745411607160n) // "~9999.87"
 * formatBalance(99999000000000000000000n) // "99999"
 * formatBalance(99010000000000000000n) // "99.01"
 *
 * // For USDC (6 decimals)
 * formatBalance(9999869888n, 6) // "~9999.87"
 */
export function formatBalance(
	value: bigint,
	decimals: number = 18,
	maxSymbols: number = 7,
): string {
	// Handle negative values
	const isNegative = value < 0n;
	const absoluteValue = isNegative ? -value : value;

	// Calculate integer and fractional parts using bigint arithmetic
	const divisor = 10n ** BigInt(decimals);
	const integerPart = absoluteValue / divisor;
	const fractionalPart = absoluteValue % divisor;

	const integerStr = integerPart.toString();

	// If no fractional part, return integer only
	if (fractionalPart === 0n) {
		return (isNegative ? '-' : '') + integerStr;
	}

	// Calculate how many decimal places we can show
	// Account for: negative sign (if any), integer digits, and the dot itself
	const negativeOffset = isNegative ? 1 : 0;
	const usedSymbols = negativeOffset + integerStr.length + 1; // +1 for the dot

	// If integer part alone already uses all symbols, just show integer
	if (usedSymbols >= maxSymbols) {
		// We're truncating decimals - actual value is greater
		return '>' + (isNegative ? '-' : '') + integerStr;
	}

	const availableDecimalPlaces = maxSymbols - usedSymbols;

	// Convert fractional part to string with leading zeros
	const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

	// Check if we can show all decimals (after trimming trailing zeros)
	const trimmedFractional = fractionalStr.replace(/0+$/, '');

	if (trimmedFractional.length <= availableDecimalPlaces) {
		// No rounding needed - exact value fits
		if (trimmedFractional === '') {
			return (isNegative ? '-' : '') + integerStr;
		}
		return (isNegative ? '-' : '') + integerStr + '.' + trimmedFractional;
	}

	// Need to round - determine the rounding direction
	const keptDigits = fractionalStr.slice(0, availableDecimalPlaces);
	const nextDigit = parseInt(fractionalStr[availableDecimalPlaces] || '0', 10);

	// Check if there are any non-zero digits after the rounding position
	const remainingDigits = fractionalStr.slice(availableDecimalPlaces);
	const allRemainingZeros = /^0*$/.test(remainingDigits);

	if (allRemainingZeros) {
		// Exact value, no rounding needed
		const trimmed = keptDigits.replace(/0+$/, '');
		if (trimmed === '') {
			return (isNegative ? '-' : '') + integerStr;
		}
		return (isNegative ? '-' : '') + integerStr + '.' + trimmed;
	}

	// Determine if we should round up
	const hasMoreNonZeroDigits =
		fractionalStr.slice(availableDecimalPlaces + 1).replace(/0/g, '').length >
		0;
	let roundUp = false;

	if (nextDigit > 5) {
		roundUp = true;
	} else if (nextDigit === 5) {
		// Round half up (or banker's rounding for exact .5)
		roundUp =
			hasMoreNonZeroDigits ||
			parseInt(keptDigits[keptDigits.length - 1] || '0', 10) % 2 !== 0;
	}

	if (roundUp) {
		// Perform the rounding up using bigint arithmetic for precision
		const roundingScale = 10n ** BigInt(decimals - availableDecimalPlaces);
		const roundedFractional =
			(fractionalPart / roundingScale + 1n) * roundingScale;

		if (roundedFractional >= divisor) {
			// Fractional part rolled over to next integer
			const newInteger = integerPart + 1n;
			const newFractional = roundedFractional - divisor;

			if (newFractional === 0n) {
				return '~' + (isNegative ? '-' : '') + newInteger.toString();
			}

			const newFractionalStr = newFractional
				.toString()
				.padStart(decimals, '0')
				.slice(0, availableDecimalPlaces)
				.replace(/0+$/, '');

			if (newFractionalStr === '') {
				return '~' + (isNegative ? '-' : '') + newInteger.toString();
			}

			return (
				'~' +
				(isNegative ? '-' : '') +
				newInteger.toString() +
				'.' +
				newFractionalStr
			);
		}

		const roundedFractionalStr = roundedFractional
			.toString()
			.padStart(decimals, '0')
			.slice(0, availableDecimalPlaces)
			.replace(/0+$/, '');

		if (roundedFractionalStr === '') {
			return '~' + (isNegative ? '-' : '') + integerStr;
		}

		return (
			'~' + (isNegative ? '-' : '') + integerStr + '.' + roundedFractionalStr
		);
	} else {
		// Round down (truncate) - actual value is greater than shown
		const truncated = keptDigits.replace(/0+$/, '');

		if (truncated === '') {
			return '>' + (isNegative ? '-' : '') + integerStr;
		}

		return '>' + (isNegative ? '-' : '') + integerStr + '.' + truncated;
	}
}

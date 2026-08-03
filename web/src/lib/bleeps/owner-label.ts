import {truncateHex} from '$lib/core/utils/format/hex';

/**
 * How many characters the owner line on a tile can hold before it runs into the
 * tile's own edge. A truncated address ("0x1234...5678") is 13, so this leaves
 * a little room for a name without shrinking the type.
 */
export const MAX_OWNER_LABEL_LENGTH = 18;

/**
 * What to write on a Bleep for its owner: the ENS name when there is one,
 * otherwise the truncated address.
 *
 * Names are cut down to fit the tile. The cut keeps the head and the top-level
 * label ("...eth"), because that tail is what tells a reader it is a name at
 * all.
 */
export function ownerLabel(
	owner: string | undefined,
	ensName?: string | null,
): string {
	if (!owner) return '';
	if (!ensName) return truncateHex(owner);
	if (ensName.length <= MAX_OWNER_LABEL_LENGTH) return ensName;

	const dot = ensName.lastIndexOf('.');
	// Only treat the tail as a top-level label if keeping it still leaves room
	// for a meaningful head.
	const suffix =
		dot > 0 && ensName.length - dot < MAX_OWNER_LABEL_LENGTH / 2
			? ensName.slice(dot)
			: '';
	const head = ensName.slice(0, MAX_OWNER_LABEL_LENGTH - 3 - suffix.length);
	return `${head}...${suffix}`;
}

<script lang="ts">
	import {truncateHex} from '$lib/core/utils/format/hex';
	import {
		colorFromId,
		hertz,
		instrumentNameFromId,
		noteName,
	} from '$lib/melodies/notes';

	type Props = {
		id: number;
		/** The owner, or the zero address / undefined when unminted. */
		owner?: string;
		/** Ring the tile, to pick out the connected account's own Bleeps. */
		yours?: boolean;
		interactive?: boolean;
	};

	let {id, owner, yours = false, interactive = true}: Props = $props();

	// Everything drawn here is derived from the id alone, so the whole 576-tile
	// grid renders without a single chain call. `tokenURI`, which is the
	// authoritative render, costs about 7.5M gas and is only fetched for the one
	// Bleep a user opens.
	const color = $derived(`#${colorFromId(id)}`);
	const frequency = $derived(hertz(id));
	const note = $derived(noteName(id));
	const instrument = $derived(instrumentNameFromId(id));

	const BORDER = '#dab894';
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const isOwned = $derived(!!owner && owner !== ZERO_ADDRESS);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 512 512"
	class={interactive ? 'cursor-pointer' : ''}
	style={`stroke:${color};fill:${color};${
		yours ? 'border-radius:16pt;box-shadow:0 0 0 4pt #34D399;' : ''
	}`}
	role="img"
	aria-label={`${instrument} ${note}${isOwned ? ', owned' : ', not minted'}`}
>
	<rect
		x="6"
		y="6"
		width="500"
		height="500"
		rx="64"
		style={`fill:#000;stroke-width:16;stroke:${BORDER}`}
	/>

	<text
		x="35"
		y="35"
		dominant-baseline="hanging"
		text-anchor="start"
		style={`fill:${color};font-size:32px;`}>{frequency}</text
	>
	<text
		x="256"
		y="115"
		dominant-baseline="middle"
		text-anchor="middle"
		style="font-size:36px;">{instrument}</text
	>
	<text
		x="256"
		y="390"
		dominant-baseline="middle"
		text-anchor="middle"
		style={`fill:${color};font-size:64px;`}>{note}</text
	>

	{#if isOwned && owner}
		<text
			x="30"
			y="465"
			dominant-baseline="middle"
			text-anchor="start"
			style={`fill:${color};font-size:32px;`}>{truncateHex(owner)}</text
		>
	{/if}

	<!-- A static equaliser, purely decorative. -->
	<g transform="translate(185,160)scale(0.7,0.7)" opacity={isOwned ? 1 : 0.35}>
		<rect x="0" y="70" width="20" height="80" rx="10" />
		<rect x="38" y="24" width="20" height="172" rx="10" />
		<rect x="76" y="60" width="20" height="100" rx="10" />
		<rect x="114" y="60" width="20" height="100" rx="10" />
		<rect x="152" y="0" width="20" height="220" rx="10" />
		<rect x="190" y="35" width="20" height="150" rx="10" />
	</g>
</svg>

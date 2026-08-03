<script lang="ts">
	import {
		colorFromId,
		hertz,
		instrumentNameFromId,
		noteName,
	} from '$lib/melodies/notes';
	import {useENS} from '$lib/core/capabilities';
	import {createENSNameStore} from '$lib/core/ui/ethereum/ens';
	import {ownerLabel} from './owner-label';

	type Props = {
		id: number;
		/** The owner, or the zero address / undefined when unminted. */
		owner?: string;
		/**
		 * Ring the tile, to pick out the connected account's own Bleeps in the
		 * sale grid. Only for views that cannot say it in words: where there is
		 * room for an owner line, colour that instead.
		 */
		yours?: boolean;
		/**
		 * Look the owner's ENS name up and write that instead of the address.
		 * Off by default: the sale draws 576 of these at once and each unresolved
		 * owner is a reverse lookup against mainnet.
		 */
		resolveENS?: boolean;
		interactive?: boolean;
		/**
		 * Where this Bleep is in the play cycle. `loading` is not decoration: the
		 * contract takes a moment to render its WAV, and without it a click looks
		 * like it did nothing. See lib/bleeps/sound.ts.
		 */
		playState?: 'idle' | 'loading' | 'playing';
		/** Somebody else is in the middle of buying it (booking service). */
		booked?: boolean;
		/** This user is buying it and the chain has not confirmed yet. */
		pending?: boolean;
	};

	let {
		id,
		owner,
		yours = false,
		resolveENS = false,
		interactive = true,
		playState = 'idle',
		booked = false,
		pending = false,
	}: Props = $props();

	// Everything drawn here is derived from the id alone, so the whole 576-tile
	// grid renders without a single chain call. `tokenURI`, which is the
	// authoritative render, costs about 7.5M gas and is only fetched for the
	// Bleeps a user actually plays.
	const color = $derived(`#${colorFromId(id)}`);
	const frequency = $derived(hertz(id));
	const note = $derived(noteName(id));
	const instrument = $derived(instrumentNameFromId(id));

	const BORDER = '#dab894';
	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const isOwned = $derived(!!owner && owner !== ZERO_ADDRESS);
	const border = $derived(booked ? '#6b7280' : BORDER);

	// Optional capability: without an ENS node the store stays inert and the
	// tile keeps showing the truncated address.
	const ens = createENSNameStore(useENS(), {seedFromCache: true});
	$effect(() => {
		ens.setAddress(
			resolveENS && isOwned && owner ? (owner as `0x${string}`) : undefined,
		);
	});
	const ownerText = $derived(ownerLabel(owner, $ens.name));

	const label = $derived(
		`${instrument} ${note}${isOwned ? ', owned' : ', not minted'}` +
			(booked ? ', booked' : '') +
			(pending ? ', purchase pending' : ''),
	);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 512 512"
	class={interactive ? 'cursor-pointer' : ''}
	class:pending
	style={`stroke:${color};fill:${color};${
		yours ? 'border-radius:16pt;box-shadow:0 0 0 4pt #34D399;' : ''
	}`}
	role="img"
	aria-label={label}
>
	<rect
		x="6"
		y="6"
		width="500"
		height="500"
		rx="64"
		style={`fill:#000;stroke-width:16;stroke:${border}`}
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
			style={`fill:${color};font-size:32px;`}>{ownerText}</text
		>
	{/if}

	<!-- The equaliser: still while nothing is playing, moving while it is. -->
	<g
		transform="translate(185,160)scale(0.7,0.7)"
		opacity={isOwned || playState !== 'idle' ? 1 : 0.35}
		class="equaliser {playState}"
	>
		<rect x="0" y="70" width="20" height="80" rx="10" />
		<rect x="38" y="24" width="20" height="172" rx="10" />
		<rect x="76" y="60" width="20" height="100" rx="10" />
		<rect x="114" y="60" width="20" height="100" rx="10" />
		<rect x="152" y="0" width="20" height="220" rx="10" />
		<rect x="190" y="35" width="20" height="150" rx="10" />
	</g>
</svg>

<style>
	/* Bars scale about their own middle, so they read as levels rather than as
	   the whole group growing. */
	.equaliser rect {
		transform-box: fill-box;
		transform-origin: center;
	}

	.equaliser.playing rect {
		animation: bleep-bar 0.45s ease-in-out infinite alternate;
	}
	.equaliser.playing rect:nth-child(2) {
		animation-duration: 0.3s;
	}
	.equaliser.playing rect:nth-child(3) {
		animation-duration: 0.55s;
	}
	.equaliser.playing rect:nth-child(4) {
		animation-duration: 0.38s;
	}
	.equaliser.playing rect:nth-child(5) {
		animation-duration: 0.6s;
	}
	.equaliser.playing rect:nth-child(6) {
		animation-duration: 0.33s;
	}

	/* Waiting on the contract to render the WAV. */
	.equaliser.loading {
		animation: bleep-waiting 0.9s ease-in-out infinite;
	}

	.pending {
		animation: bleep-waiting 1.4s ease-in-out infinite;
	}

	@keyframes bleep-bar {
		from {
			transform: scaleY(0.25);
		}
		to {
			transform: scaleY(1);
		}
	}

	@keyframes bleep-waiting {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.equaliser.playing rect,
		.equaliser.loading,
		.pending {
			animation: none;
		}
	}
</style>

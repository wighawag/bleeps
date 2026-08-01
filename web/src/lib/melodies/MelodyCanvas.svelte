<script lang="ts">
	import {untrack} from 'svelte';
	import type {Writable} from 'svelte/store';
	import type {MelodyInfo} from './melody';
	import {
		DEFAULT_GEOMETRY,
		canvasSize,
		createMelodyEditor,
		heightOfNote,
		heightOfVolume,
		instrumentColor,
		slotWidth,
		toCanvas,
		volumeColor,
		type Geometry,
	} from './melody-editor';

	type Props = {
		melody: Writable<MelodyInfo>;
		editable?: boolean;
		geometry?: Geometry;
		nameFontSize?: number;
		creatorFontSize?: number;
		/** Shown under the name. The wallet address when there is one, else a prompt. */
		creator?: string;
	};

	let {
		melody,
		editable = false,
		geometry = DEFAULT_GEOMETRY,
		nameFontSize = 28,
		creatorFontSize = 16,
		creator,
	}: Props = $props();

	// The editor owns drag state, so it is built ONCE. Rebuilding it because a
	// prop changed identity would drop a drag half way through. The melody
	// CONTENTS stay reactive through the store, which is the thing that actually
	// changes; geometry and editability are configuration fixed at mount.
	const editorGeometry = untrack(() => geometry);
	const isEditable = untrack(() => editable);
	const editor = untrack(() =>
		createMelodyEditor(melody, {
			geometry: editorGeometry,
			editable: isEditable,
		}),
	);

	const {width, height} = canvasSize(editorGeometry);
	const slot = slotWidth(editorGeometry);
	const {margin, gap, slotHeight, middleGap, volumeHeight} = editorGeometry;

	const NOTE_RANGE = 64;
	const VOLUME_RANGE = 8;

	let element = $state<SVGSVGElement | undefined>(undefined);

	function at(event: MouseEvent) {
		if (!element) {
			return undefined;
		}
		const rect = element.getBoundingClientRect();
		return toCanvas(
			editorGeometry,
			element,
			event.clientX - rect.left,
			event.clientY - rect.top,
		);
	}

	function onmousedown(event: MouseEvent) {
		const point = at(event);
		if (point) {
			editor.begin(point.x, point.y, !event.shiftKey);
		}
	}

	// Move and up are tracked on the window, not the svg, so a drag that runs off
	// the edge of the canvas keeps painting instead of stopping mid-gesture.
	function onwindowmousemove(event: MouseEvent) {
		const point = at(event);
		if (point) {
			editor.move(point.x, point.y, !event.shiftKey);
		}
	}
</script>

<svelte:window onmousemove={onwindowmousemove} onmouseup={() => editor.end()} />

<svg
	bind:this={element}
	class="inline-block touch-none select-none"
	xmlns="http://www.w3.org/2000/svg"
	viewBox={`0 0 ${width} ${height}`}
	style={`width:${width}px;max-width:100%;`}
	role={isEditable ? 'application' : 'img'}
	aria-label={`melody ${$melody.name}`}
	{onmousedown}
>
	<rect
		x={margin / 2}
		y={margin / 2}
		width={width - margin}
		height={height - margin}
		fill="#111"
	/>

	{#each $melody.slots as s, index (index)}
		<rect
			x={index * slot + gap / 2 + margin / 2}
			y={slotHeight -
				(heightOfNote(s) / NOTE_RANGE) * (slotHeight - margin) -
				margin / 2}
			width={slot - gap}
			height={(heightOfNote(s) / NOTE_RANGE) * (slotHeight - margin)}
			fill={`#${s.volume === 0 ? '222' : instrumentColor(s.instrument)}`}
		/>
	{/each}

	<text
		x={width / 2}
		y={slotHeight + middleGap / 8}
		dominant-baseline="hanging"
		text-anchor="middle"
		style={`fill:#dab894;font-size:${nameFontSize}px;`}>{$melody.name}</text
	>

	<text
		x={width / 2}
		y={slotHeight + (middleGap * 7) / 8}
		dominant-baseline="auto"
		text-anchor="middle"
		style={`fill:#dab894;font-size:${creatorFontSize}px;pointer-events:none;`}
		>{creator ?? 'To be created....'}</text
	>

	{#each $melody.slots as s, index (index)}
		<rect
			x={index * slot + gap / 2 + margin / 2}
			y={middleGap + slotHeight + margin / 2}
			width={slot - gap}
			height={(heightOfVolume(s) / VOLUME_RANGE) * (volumeHeight - margin)}
			fill={`#${volumeColor(s.volume)}`}
		/>
	{/each}
</svg>

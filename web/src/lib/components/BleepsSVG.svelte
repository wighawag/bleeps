<script lang="ts">
  import {hertz, noteName} from '$lib/utils/notes';
  import {symbolSVG} from '$lib/utils/symbols';
  import {createEventDispatcher} from 'svelte';

  export let id: number;
  export let minted: boolean;
  export let disabled: boolean;

  $: color = minted ? '#dab894' : disabled ? '#666' : '#ddd';

  $: if (minted) console.log({minted, id});

  let hz = hertz(id);
  let name = noteName(id);

  $: svgpath = symbolSVG(id);

  const dispatch = createEventDispatcher();

  function forward(event) {
    // if (!disabled) {
    dispatch('click', event);
    // }
  }
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 512 512"
  style={`background-color:#000;cursor:pointer;`}
  on:click={forward}
>
  <!-- ${disabled ? '' : 'cursor:pointer;'}-->
  <rect x="0" width="512" height="512" rx="64" style={`stroke-width:8;stroke:${color}`} />
  <text x="30" y="30" dominant-baseline="hanging" text-anchor="start" style={`fill: ${color}; font-size: 32px;`}
    >{hz}</text
  >
  <g transform="translate(210,130) scale(0.2,0.2)" style={`fill:${color}`}>{@html svgpath}</g>
  <text x="256" y="330" dominant-baseline="middle" text-anchor="middle" style={`fill: ${color}; font-size: 72px;`}
    >{name}</text
  ></svg
>

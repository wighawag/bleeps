<script lang="ts">
  import type {Melody} from '$lib/stores/melodies';

  import {displayAddress} from '$lib/utils';
  import {createEventDispatcher} from 'svelte';

  export let melody: Melody;
  export let your: boolean;
  export let pointer: boolean = true;

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
  style={`${pointer ? 'cursor:pointer;' : 'cursor:none'}stroke:#f6fe63;fill:#f6fe63;${
    your ? 'border: none; border-radius: 16pt;box-shadow: 0 0 0 4pt #34D399;outline: none;' : ''
  }`}
  on:click={forward}
>
  <!-- ${disabled ? '' : 'cursor:pointer;'}-->
  <rect x="6" y="6" width="500" height="500" rx="64" style={`fill:#000;stroke-width:16;stroke:#f6fe63`} />
  <g class={`opacity-100 ${pointer ? 'hover:opacity-100' : ''}`}>
    <text x="256" y="390" dominant-baseline="middle" text-anchor="middle" style={`fill: #f6fe63; font-size: 64px;`}
      >{melody.name}</text
    >

    {#if melody.owner?.id && melody.owner.id != '0x0000000000000000000000000000000000000000'}
      <text x="30" y="465" dominant-baseline="middle" text-anchor="start" style={`fill: #f6fe63; font-size: 32px;`}
        >{displayAddress(melody.owner.id, 10)}</text
      >
    {/if}
  </g></svg
>

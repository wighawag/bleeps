<script lang="ts">
  import {displayAddress} from '$lib/utils';

  import {hertz, noteName, instrumentNameFromId, colorFromId} from '$lib/utils/notes';
  import {createEventDispatcher} from 'svelte';

  export let id: number;
  export let your: boolean;
  export let pointer: boolean = true;
  export let owner: string | undefined = undefined;

  $: color = '#' + colorFromId(id);
  // $: color = minted ? '#' + colorFromId(id) : disabled ? '#666' : '#' + colorFromId(id); //minted ? '#dab894' : disabled ? '#666' : '#ddd';

  $: borderColor = '#dab894';

  // $: if (minted) console.log({minted, id});

  let hz = hertz(id);
  let name = noteName(id);
  let instrName = instrumentNameFromId(id);

  // $: svgpath = symbolSVG(id);

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
  style={`${pointer ? 'cursor:pointer;' : 'cursor:none'}stroke:${color};fill:${color};${
    your ? 'border: none; border-radius: 16pt;box-shadow: 0 0 0 4pt #34D399;outline: none;' : ''
  }`}
  on:click={forward}
>
  <!-- ${disabled ? '' : 'cursor:pointer;'}-->
  <rect x="6" y="6" width="500" height="500" rx="64" style={`fill:#000;stroke-width:16;stroke:${borderColor}`} />
  <g class={`opacity-100 ${pointer ? 'hover:opacity-100' : ''}`}>
    <rect style="visibility: visible;pointer-events: visible;fill:none;" x="0" y="0" width="512" height="512" />
    <text x="35" y="35" dominant-baseline="hanging" text-anchor="start" style={`fill: ${color}; font-size: 32px;`}
      >{hz}</text
    >
    <text x="256" y="115" dominant-baseline="middle" text-anchor="middle" style="font-size:36px;">{instrName}</text>
    <!-- <g transform="translate(210,130) scale(0.2,0.2)" style={`fill:${color}`}>{@html svgpath}</g> -->

    <text x="256" y="390" dominant-baseline="middle" text-anchor="middle" style={`fill: ${color}; font-size: 64px;`}
      >{name}</text
    >

    {#if owner && owner != '0x0000000000000000000000000000000000000000'}
      <text x="30" y="465" dominant-baseline="middle" text-anchor="start" style={`fill: ${color}; font-size: 32px;`}
        >{displayAddress(owner, 10)}</text
      >
    {/if}

    <g transform="translate(185,160)scale(0.7,0.7)">
      <style>
        /* .Z {
          animation: pulse 1s infinite;
          transform-box: fill-box;
          transform-origin: center;
          stroke: none;
        } */
        /* #A {
          animation-delay: 0.15s;
        }
        #B {
          animation-delay: 0.3s;
        }
        #C {
          animation-delay: 0.45s;
        }
        #D {
          animation-delay: 0.6s;
        }
        #E {
          animation-delay: 0.75s;
        }
        #F {
          animation-delay: 0.9s;
        }
        @keyframes pulse {
          0% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.7);
          }
          100% {
            transform: scaleY(1);
            transform-origin: center;
          }
        } */
      </style>
      <rect class="Z" id="A" x="0" y="70" width="20" height="80" rx="10" /><rect
        class="Z"
        id="B"
        x="38"
        y="24"
        width="20"
        height="172"
        rx="10"
      /><rect class="Z" id="C" x="76" y="60" width="20" height="100" rx="10" /><rect
        class="Z"
        id="D"
        x="114"
        y="60"
        width="20"
        height="100"
        rx="10"
      /><rect class="Z" id="E" x="152" y="0" width="20" height="220" rx="10" /><rect
        class="Z"
        id="F"
        x="190"
        y="35"
        width="20"
        height="150"
        rx="10"
      /></g
    >
  </g></svg
>

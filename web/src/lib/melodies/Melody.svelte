<script lang="ts">
  import {currentMelody, Slot} from './currentMelody';
  import {hertz, noteName, instrumentNameFromId, colorFromId} from '$lib/utils/notes';
  import {wallet} from '$lib/stores/wallet';

  export let editable = false;

  const volumeHeight = 64;
  const middleGap = 64;
  const slotHeight = 512;
  const height = slotHeight + middleGap + volumeHeight;
  const width = height;

  const margin = 0;
  const gap = 4;
  const slotWidth = (width - margin) / 32;

  let startedDrawing: 'volume' | 'note' | undefined;
  let mouseIsDown = false;
  let selectedInstrument: number = 0;
  let drawingEmabled = true;

  let element: SVGSVGElement;
  function click(event: MouseEvent) {
    // console.log(event.target);
    // console.log(event.offsetX, event.offsetY);
    // console.log(event);
    // console.log(event.offsetX / element.clientWidth, event.offsetY / element.clientHeight);
    // const x = width * (event.offsetX / element.clientWidth);
    // const y = height * (1 - event.offsetY / element.clientHeight);
    // console.log({x, y});
    // set(x, y);
  }

  function mousedown(event: MouseEvent) {
    // mouseIsDown = true;
    const x = width * (event.offsetX / element.clientWidth);
    const y = height * (1 - event.offsetY / element.clientHeight);
    console.log({x, y});
    set(x, y);
  }

  function mouseup(event: MouseEvent) {
    // mouseIsDown = false;
  }

  function globalmousedown(event: MouseEvent) {
    mouseIsDown = true;
  }

  function globalmousemove(event: MouseEvent) {
    if (mouseIsDown) {
      var rect = element.getBoundingClientRect();
      const lx = event.pageX - rect.left;
      const ly = event.pageY - rect.top;
      const tx = Math.min(Math.max(0, lx), element.clientWidth - 1);
      const ty = Math.min(Math.max(0, ly), element.clientHeight - 1);

      const x = width * (tx / element.clientWidth);
      const y = height * (1 - ty / element.clientHeight);

      // console.log({lx, ly});
      if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) {
        if (startedDrawing) {
          set(x, y);
        }
      } else {
        set(x, y);
      }
    }
  }

  function globalclick(event: MouseEvent) {}

  function globalmouseup(event: MouseEvent) {
    startedDrawing = undefined;
    mouseIsDown = false;
  }

  function mouseleave(event: MouseEvent) {
    // mouseIsDown = false;
  }

  function mouseenter(event: MouseEvent) {
    // console.log(event.button);
    // console.log(event);
  }

  function heightOfNote(slot: Slot): number {
    return slot.note + 1;
    // return slot.volume === 0 ? 0 : slot.note + 1;
  }

  function heightOfVolume(slot: Slot): number {
    return slot.volume + 1;
    // return slot.volume === 0 ? 0 : slot.note + 1;
  }

  function mousemove(event: MouseEvent) {
    // if (mouseIsDown) {
    //   const x = width * (event.offsetX / element.clientWidth);
    //   const y = height * (1 - event.offsetY / element.clientHeight);
    //   set(x, y);
    // }
  }

  function set(x: number, y: number) {
    if (!editable || !drawingEmabled) {
      return;
    }
    const slot = Math.floor((x - margin / 2) / slotWidth);

    if ((startedDrawing === undefined && y < volumeHeight) || startedDrawing == 'volume') {
      startedDrawing = 'volume';

      const actualY = Math.max(0, volumeHeight - y);
      const volume = Math.floor(actualY / (volumeHeight / 8));
      if (volume !== $currentMelody.slots[slot].volume) {
        $currentMelody.slots[slot].volume = volume;
      }

      // TODO volume == 0 => note = 0 ?
    } else if ((startedDrawing === undefined && y > volumeHeight + middleGap) || startedDrawing == 'note') {
      startedDrawing = 'note';

      const actualY = Math.max(0, y - (volumeHeight + middleGap));
      const note = Math.floor((actualY - margin / 2) / (slotHeight / 64));
      if (note !== $currentMelody.slots[slot].note || selectedInstrument != $currentMelody.slots[slot].instrument) {
        $currentMelody.slots[slot].note = note;
        $currentMelody.slots[slot].instrument = selectedInstrument;
      }
    }
  }

  function instrumentColor(instrument: number): string {
    return colorFromId(instrument << 6);
  }

  function volumeColor(volume: number): string {
    switch (volume) {
      case 0:
        return '000';
      case 1:
        return '222';
      case 2:
        return '444';
      case 3:
        return '666';
      case 4:
        return '888';
      case 5:
        return 'aaa';
      case 6:
        return 'ccc';
    }
    return 'fff';
  }

  function editname(event: MouseEvent) {
    drawingEmabled = false;
    const svgtext = event.target as SVGTextElement;

    // from : https://stackoverflow.com/questions/9308938/inline-text-editing-in-svg/68706140#68706140
    const input = document.createElement('input');
    input.value = svgtext.textContent;
    input.onkeyup = function (e) {
      if (['Enter', 'Escape'].includes(e.key)) {
        this.blur();
        return;
      }
      svgtext.textContent = this.value;
    };
    input.onblur = function (e) {
      myforeign.remove();
      drawingEmabled = true;
    };

    var myforeign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    myforeign.setAttribute('width', '100%');
    myforeign.setAttribute('height', '100%');
    myforeign.setAttribute('x', '' + 0);
    myforeign.setAttribute('y', '' + (slotHeight + middleGap / 8 - 8));
    myforeign.setAttribute('style', 'position:absolute; text-align:left;');

    myforeign.append(input);

    const svg = svgtext.parentNode;
    svg.append(myforeign);

    input.focus();
    input.select();
    input.setAttribute(
      'style',
      'width:100%; height:48px; font-size: 28px; background-color:black; text-align:center; color: #dab894;'
    );

    // input.style.display = 'none'
  }
</script>

<svelte:window
  on:mousedown={globalmousedown}
  on:mouseup={globalmouseup}
  on:mousemove={globalmousemove}
  on:click={globalclick}
/>

<div class="text-center">
  <svg
    class="inline-block"
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${width} ${height}`}
    style="width:512px;"
    on:click={click}
    on:mousedown={mousedown}
    on:mousemove={mousemove}
    on:mouseup={mouseup}
    on:mouseleave={mouseleave}
    on:mouseenter={mouseenter}
    bind:this={element}
  >
    <style>
      input:focus {
        outline: none;
      }
    </style>
    <rect x={margin / 2} y={margin / 2} width={width - margin} height={height - margin} style={`fill:#111;`} />
    {#each $currentMelody.slots as slot, index}
      <rect
        x={index * slotWidth + gap / 2 + margin / 2}
        y={slotHeight - (heightOfNote(slot) / 64) * (slotHeight - margin) - margin / 2}
        width={slotWidth - gap}
        height={(heightOfNote(slot) / 64) * (slotHeight - margin)}
        style={`fill:#${slot.volume === 0 ? '222' : instrumentColor(slot.instrument)};`}
      />
    {/each}

    <text
      x={width / 2}
      y={slotHeight + middleGap / 8}
      on:click={editname}
      dominant-baseline="hanging"
      text-anchor="middle"
      style={`fill: #dab894; font-size: 28px;${
        editable
          ? '-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none; -webkit-tap-highlight-color:  rgba(255, 255, 255, 0); '
          : ''
      }`}>{$currentMelody.name}</text
    >

    <text
      x={width / 2}
      y={slotHeight + (middleGap * 7) / 8}
      dominant-baseline="bottom"
      text-anchor="middle"
      style={`fill: #dab894; font-size: 16px;${
        editable
          ? 'pointer-events: none;-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none; -webkit-tap-highlight-color:  rgba(255, 255, 255, 0); '
          : ''
      }`}
      >{#if $wallet.address}Created by {$wallet.address}{:else}To be created....{/if}</text
    >

    {#each $currentMelody.slots as slot, index}
      <rect
        x={index * slotWidth + gap / 2 + margin / 2}
        y={middleGap + slotHeight + margin / 2}
        width={slotWidth - gap}
        height={(heightOfVolume(slot) / 8) * (volumeHeight - margin)}
        style={`fill:#${volumeColor(slot.volume)};`}
      />
    {/each}
  </svg>
</div>

{#if editable}
  <div class="m-3">
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as instrument}
      <button
        on:click={() => (selectedInstrument = instrument)}
        class={`inline-block w-6 h-6 mx-2 ${selectedInstrument === instrument ? 'outline-white' : ''}`}
        style={`background-color: #${instrumentColor(instrument)}`}
      />
    {/each}
  </div>
{/if}

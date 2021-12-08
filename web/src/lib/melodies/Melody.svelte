<script lang="ts">
  import {currentMelody, Slot} from './currentMelody';
  import {hertz, noteName, instrumentNameFromId, colorFromId} from '$lib/utils/notes';

  const width = 512 + 64;
  const volumeHeight = 64;
  const slotHeight = 512;
  const height = slotHeight + volumeHeight;

  const margin = 0;
  const gap = 2;
  const slotWidth = (width - margin) / 32;

  let startedDrawing = false;
  let mouseIsDown = false;
  let selectedInstrument: number = 0;

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
        startedDrawing = true;
        set(x, y);
      }
    }
  }

  function globalclick(event: MouseEvent) {}

  function globalmouseup(event: MouseEvent) {
    startedDrawing = false;
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
    const slot = Math.floor((x - margin / 2) / slotWidth);

    if (y < volumeHeight) {
      const actualY = volumeHeight - y;
      const volume = Math.floor(actualY / (volumeHeight / 8));
      if (volume !== $currentMelody.slots[slot].volume) {
        $currentMelody.slots[slot].volume = volume;
      }

      // TODO volume == 0 => note = 0 ?
    } else {
      const actualY = y - volumeHeight;

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

    {#each $currentMelody.slots as slot, index}
      <rect
        x={index * slotWidth + gap / 2 + margin / 2}
        y={slotHeight + margin / 2}
        width={slotWidth - gap}
        height={(heightOfVolume(slot) / 8) * (volumeHeight - margin)}
        style={`fill:#${volumeColor(slot.volume)};`}
      />
    {/each}
  </svg>
</div>

<div class="m-3">
  {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as instrument}
    <button
      on:click={() => (selectedInstrument = instrument)}
      class={`inline-block w-6 h-6 mx-2 ${selectedInstrument === instrument ? 'outline-white' : ''}`}
      style={`background-color: #${instrumentColor(instrument)}`}
    />
  {/each}
</div>

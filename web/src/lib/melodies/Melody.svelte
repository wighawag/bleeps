<script lang="ts">
  import {currentMelody, MelodyInfo, Slot} from './currentMelody';
  import {hertz, noteName, instrumentNameFromId, colorFromId, noteOctave, noteSharp} from '$lib/utils/notes';
  import {wallet} from '$lib/stores/wallet';
  import GreenNavButton from '$lib/components/navigation/GreenNavButton.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import {importMelodiesFromPico8String} from '$lib/utils/importer';

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

  let graphView = false;

  let element: SVGSVGElement;
  function click(event: MouseEvent) {
    // console.log(event.target);
    // console.log(event.offsetX, event.offsetY);
    // console.log(event);
    // console.log(event.offsetX / element.clientWidth, event.offsetY / element.clientHeight);
    // const x = width * (event.offsetX / element.clientWidth);
    // const y = height * (1 - event.offsetY / element.clientHeight);
    // console.log({x, y});
    // set(x, y, !event.shiftKey);
  }

  function mousedown(event: MouseEvent) {
    // mouseIsDown = true;
    const x = width * (event.offsetX / element.clientWidth);
    const y = height * (1 - event.offsetY / element.clientHeight);
    console.log({x, y});
    set(x, y, !event.shiftKey);
  }

  function mouseup(event: MouseEvent) {
    // mouseIsDown = false;
  }

  function globalmousedown(event: MouseEvent) {
    mouseIsDown = true;
  }

  function globalmousemove(event: MouseEvent) {
    if (!element) {
      return;
    }
    if (mouseIsDown) {
      var rect = element.getBoundingClientRect();
      const lx = event.pageX - window.scrollX - rect.left;
      const ly = event.pageY - window.scrollY - rect.top;
      const tx = Math.min(Math.max(0, lx), element.clientWidth - 1);
      const ty = Math.min(Math.max(0, ly), element.clientHeight - 1);

      const x = width * (tx / element.clientWidth);
      const y = height * (1 - ty / element.clientHeight);

      // console.log({lx, ly});
      if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) {
        if (startedDrawing) {
          set(x, y, !event.shiftKey);
        }
      } else {
        set(x, y, !event.shiftKey);
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
    clearSelection();
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
    //   set(x, y, !event.shiftKey);
    // }
  }

  function set(x: number, y: number, setNote: boolean = true) {
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
      if (
        note !== $currentMelody.slots[slot].note ||
        selectedInstrument != $currentMelody.slots[slot].instrument ||
        $currentMelody.slots[slot].volume === 0
      ) {
        if ($currentMelody.slots[slot].volume === 0) {
          $currentMelody.slots[slot].volume = 5;
        }
        if (setNote) {
          $currentMelody.slots[slot].note = note;
        }

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
    let name = $currentMelody.name;
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
      name = this.value;
    };
    input.onblur = function (e) {
      $currentMelody.name = name;
      myforeign.remove();
      drawingEmabled = true;
    };

    var myforeign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    myforeign.setAttribute('width', '100%');
    myforeign.setAttribute('height', '100%');
    myforeign.setAttribute('x', '' + 0);
    myforeign.setAttribute('y', '' + (slotHeight + middleGap / 8 - 8));
    myforeign.setAttribute(
      'style',
      'position:absolute; text-align:left;user-drag: none;-webkit-user-drag: none;-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;'
    );

    myforeign.append(input);

    const svg = svgtext.parentNode;
    svg.append(myforeign);

    input.focus();
    input.select();
    input.setAttribute(
      'style',
      'width:100%; height:48px; font-size: 28px; background-color:black; text-align:center; color: #dab894;user-drag: none;-webkit-user-drag: none;-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;'
    );

    // input.style.display = 'none'
  }

  function clearSelection() {
    if (typeof window !== 'undefined') {
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      } else if ((document as any).selection && (document as any).selection.empty) {
        (document as any).selection.empty();
      }
    }
  }

  let choices: undefined | MelodyInfo[];
  let sfxSelected = 0;
  function selectFromP8(index: number) {
    $currentMelody = choices[index];
    choices = undefined;
  }

  async function drop(event: any) {
    sfxSelected = 0;
    choices = [];
    event.preventDefault();

    let file: File | undefined;
    if (event.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (event.dataTransfer.items[i].kind === 'file') {
          file = event.dataTransfer.items[i].getAsFile();
          console.log('dataTransfer.items ... file[' + i + '].name = ' + file.name);
          // TODO futher files?
          break;
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (var i = 0; i < event.dataTransfer.files.length; i++) {
        file = event.dataTransfer.files[i];
        console.log('dataTransfer.files ... file[' + i + '].name = ' + file.name);
        // TODO futher files?
        break;
      }
    }
    if (file) {
      // console.log(await file.text());
      try {
        choices = importMelodiesFromPico8String(await file.text());
      } catch (e) {
        console.error(e);
      }
    }
  }
  function dragover(event: any) {
    event.preventDefault();
  }
  function globaldrop(event: any) {
    event.preventDefault();
  }
  function globaldragover(event: any) {
    event.preventDefault();
  }

  function keyCodeToNote(code: string): string | undefined {
    switch (code) {
      case 'KeyZ':
        return 'C';
      case 'KeyS':
        return 'C#';
      case 'KeyX':
        return 'D';
      case 'KeyD':
        return 'D#';
      case 'KeyC':
        return 'E';
      case 'KeyV':
        return 'F';
      case 'KeyG':
        return 'F#';
      case 'KeyB':
        return 'G';
      case 'KeyH':
        return 'G#';
      case 'KeyN':
        return 'A';
      case 'KeyJ':
        return 'A#';
      case 'KeyM':
        return 'B';
    }
    return undefined;
  }

  function noteNameToNote(noteName: string): number | undefined {
    switch (noteName.trim()) {
      case 'C':
        return 0;
      case 'C#':
        return 1;
      case 'D':
        return 2;
      case 'D#':
        return 3;
      case 'E':
        return 4;
      case 'F':
        return 5;
      case 'F#':
        return 6;
      case 'G':
        return 7;
      case 'G#':
        return 8;
      case 'A':
        return 9;
      case 'A#':
        return 10;
      case 'B':
        return 11;
    }
    console.log(`note not found: ${noteName}`);
    return undefined;
  }

  function applyValue(index: number) {
    if (typeof document === 'undefined') {
      return;
    }
    const noteInputElement = document.getElementById(`input_note_${index}`);
    const octaveInputElement = document.getElementById(`input_octave_${index}`);
    const instrumentInputElement = document.getElementById(`input_instrument_${index}`);
    const volumeInputElement = document.getElementById(`input_volume_${index}`);

    if (!(noteInputElement && octaveInputElement && instrumentInputElement && volumeInputElement)) {
      return;
    }

    noteInputElement.value =
      noteName($currentMelody.slots[index].note).slice(0, 1) +
      (noteSharp($currentMelody.slots[index].note) ? '#' : ' ');
    octaveInputElement.value = noteOctave($currentMelody.slots[index].note);
    instrumentInputElement.value = $currentMelody.slots[index].instrument;
    volumeInputElement.value = $currentMelody.slots[index].volume;
  }

  function setValue(index: number) {
    if (typeof document === 'undefined') {
      return;
    }
    const noteInputElement = document.getElementById(`input_note_${index}`);
    const octaveInputElement = document.getElementById(`input_octave_${index}`);
    const instrumentInputElement = document.getElementById(`input_instrument_${index}`);
    const volumeInputElement = document.getElementById(`input_volume_${index}`);

    if (!(noteInputElement && octaveInputElement && instrumentInputElement && volumeInputElement)) {
      return;
    }

    const noteIndex = noteNameToNote(noteInputElement.value);
    const octave = parseInt(octaveInputElement.value) - 2;
    const instrument = parseInt(instrumentInputElement.value);
    let volume = parseInt(volumeInputElement.value);

    console.log({index, noteIndex, octave, instrument, volume, note: octave * 12 + noteIndex});

    if (volume == 0) {
      volume = 5;
    }

    $currentMelody.slots[index].note = octave * 12 + noteIndex;
    $currentMelody.slots[index].instrument = instrument;
    $currentMelody.slots[index].volume = volume;
  }

  function keyCodeToNumber(key: string): number | undefined {
    const n = parseInt(key);
    if (isNaN(n)) {
      return undefined;
    }
    return n;
  }

  function getIndex(id: string): number | undefined {
    const lastIndexOfUnderscore = id.lastIndexOf('_');
    if (lastIndexOfUnderscore !== -1) {
      return parseInt(id.slice(lastIndexOfUnderscore + 1));
    }
  }

  function focusNext(id: string) {
    // id={`input_note_${r * 8 + c}`}
    const lastIndexOfUnderscore = id.lastIndexOf('_');
    if (lastIndexOfUnderscore !== -1) {
      const index = parseInt(id.slice(lastIndexOfUnderscore + 1));
      const newIndex = (index + 1) % 32;
      const newElement = document.getElementById(id.slice(0, lastIndexOfUnderscore + 1) + newIndex);
      newElement.focus();
    }
  }

  function focusprev(id: string) {
    // id={`input_note_${r * 8 + c}`}
    const lastIndexOfUnderscore = id.lastIndexOf('_');
    if (lastIndexOfUnderscore !== -1) {
      const index = parseInt(id.slice(lastIndexOfUnderscore + 1));
      let newIndex = index - 1;
      if (newIndex < 0) {
        newIndex = 31;
      }
      const newElement = document.getElementById(id.slice(0, lastIndexOfUnderscore + 1) + newIndex);
      newElement.focus();
    }
  }

  function onNoteEntered(event: KeyboardEvent) {
    console.log(event.code);
    if (event.code == 'ArrowUp') {
      focusprev(event.target.id);
      return;
    }
    if (event.code == 'ArrowDown') {
      focusNext(event.target.id);
      return;
    }
    if (event.code == 'Tab') {
      return;
    }
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    const v = keyCodeToNote(event.code);

    if (v) {
      event.target.value = v;
      setValue(getIndex(event.target.id));
      // event.target.setSelectionRange(0, event.target.value.length);
      focusNext(event.target.id);
    }

    event.preventDefault();
  }
  function onOctaveEntered(event: KeyboardEvent) {
    if (event.code == 'ArrowUp') {
      focusprev(event.target.id);
      return;
    }
    if (event.code == 'ArrowDown') {
      focusNext(event.target.id);
      return;
    }
    if (event.code == 'Tab') {
      return;
    }
    const n = keyCodeToNumber(event.key);
    if (n !== undefined && n >= 2 && n <= 9) {
      event.target.value = n;
      setValue(getIndex(event.target.id));
      focusNext(event.target.id);
    }
    event.preventDefault();
  }
  function onInstrumentEntered(event: KeyboardEvent) {
    if (event.code == 'ArrowUp') {
      focusprev(event.target.id);
      return;
    }
    if (event.code == 'ArrowDown') {
      focusNext(event.target.id);
      return;
    }
    if (event.code == 'Tab') {
      return;
    }
    const n = keyCodeToNumber(event.key);
    if (n !== undefined && n >= 0 && n <= 8) {
      event.target.value = n;
      setValue(getIndex(event.target.id));
      focusNext(event.target.id);
    }
    event.preventDefault();
  }
  function onVolumeEntered(event: KeyboardEvent) {
    if (event.code == 'ArrowUp') {
      focusprev(event.target.id);
      return;
    }
    if (event.code == 'ArrowDown') {
      focusNext(event.target.id);
      return;
    }
    if (event.code == 'Tab') {
      return;
    }
    const n = keyCodeToNumber(event.key);
    if (n !== undefined && n >= 0 && n <= 7) {
      event.target.value = n;
      setValue(getIndex(event.target.id));
      focusNext(event.target.id);
    }
    event.preventDefault();
  }

  $: {
    for (let i = 0; i < $currentMelody.slots.length; i++) {
      applyValue(i);
    }
  }
</script>

<svelte:window
  on:mousedown={globalmousedown}
  on:mouseup={globalmouseup}
  on:mousemove={globalmousemove}
  on:click={globalclick}
  on:drop={globaldrop}
  on:dragover={globaldragover}
/>

<input type="checkbox" bind:checked={graphView} />

<div class="text-center" on:drop|capture={drop} on:dragenter|capture={dragover}>
  {#if graphView}
    <svg
      class="inline-block"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      style="width:512px;user-drag: none;-webkit-user-drag: none;"
      on:click={click}
      on:mousedown={mousedown}
      on:mousemove={mousemove}
      on:mouseup={mouseup}
      on:mouseleave={mouseleave}
      on:mouseenter={mouseenter}
      bind:this={element}
    >
      <style></style>
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
        style={`fill: #dab894; font-size: 28px;user-drag: none;-webkit-user-drag: none;
        ${
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
        style={`fill: #dab894; font-size: 16px;user-drag: none;-webkit-user-drag: none;${
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
  {:else}
    <table class="inline-block" style={`width:512px;height:512px;`}>
      <tr>
        {#each [0, 1, 2, 3] as r}
          <td style="width:256px;">
            {#each [0, 1, 2, 3, 4, 5, 6, 7] as c}
              <p>
                <input
                  id={`input_note_${r * 8 + c}`}
                  tabindex={r * 8 + c + 100}
                  value={noteName($currentMelody.slots[r * 4 + c].note).slice(0, 1) +
                    (noteSharp($currentMelody.slots[r * 4 + c].note) ? '#' : ' ')}
                  class="inline bg-black text-white w-6"
                  maxlength="2"
                  on:focus={(e) => e.target.select()}
                  on:keydown={onNoteEntered}
                />
                <input
                  id={`input_octave_${r * 8 + c}`}
                  tabindex={r * 4 + c + 200}
                  value={noteOctave($currentMelody.slots[r * 4 + c].note)}
                  class="inline bg-black text-white w-3"
                  maxlength="1"
                  on:focus={(e) => e.target.select()}
                  on:keydown={onOctaveEntered}
                />
                <input
                  id={`input_instrument_${r * 8 + c}`}
                  tabindex={r * 4 + c + 300}
                  value={$currentMelody.slots[r * 4 + c].instrument}
                  class="inline bg-black text-white w-3"
                  maxlength="1"
                  on:focus={(e) => e.target.select()}
                  on:keydown={onInstrumentEntered}
                />

                <input
                  id={`input_volume_${r * 8 + c}`}
                  tabindex={r * 4 + c + 400}
                  value={$currentMelody.slots[r * 4 + c].volume}
                  class="inline bg-black text-white w-3"
                  maxlength="1"
                  on:focus={(e) => e.target.select()}
                  on:keydown={onVolumeEntered}
                />
              </p>
            {/each}
          </td>
        {/each}
      </tr>
    </table>
  {/if}
</div>

<div
  class="m-3"
  style="-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none; -webkit-tap-highlight-color:  rgba(255, 255, 255, 0);"
>
  <label class="block" for="speed"
    >Length: {$currentMelody.speed} ({Math.floor($currentMelody.speed * ((61 / 7350) * 32) * 100) / 100} seconds)
    {#if $currentMelody.speed > 16}<span class="text-yellow-600">(too long)</span>{/if}</label
  >
  <input
    class={`inline-block range ${$currentMelody.speed > 16 ? 'bg-red-500 sl-red-500' : 'bg-blue-500'}`}
    id="speed"
    type="range"
    style="width:24em;"
    bind:value={$currentMelody.speed}
    max="32"
    min="1"
  />
  <!-- {#if $currentMelody.speed >= 16}
    <br />
    <input
      class="inline-block bg-red-500"
      id="extra_speed"
      type="range"
      value={$currentMelody.speed - 16}
      on:input={(event) => ($currentMelody.speed = 16 + parseInt(event.target.value))}
      max="16"
      min="0"
    />
  {/if} -->
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

{#if choices && choices.length > 0}
  <Modal on:close={() => (choices = undefined)}>
    <div class="select-wrapper mx-auto my-2">
      <select class="select" bind:value={sfxSelected}>
        {#each choices as choice, index}
          <option value={index}>
            SFX {index}
          </option>
        {/each}
      </select>
      <span class="focus" />
    </div>
    <GreenNavButton label="select" on:click={() => selectFromP8(sfxSelected)}>OK</GreenNavButton>
  </Modal>
{/if}

<style>
  .range {
    -webkit-appearance: none;
    height: 5px;
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    background-color: blue;
    width: 15px;
    height: 15px;
    border-radius: 15px;
  }

  .sl-red-500::-webkit-slider-thumb {
    background-color: red;
  }

  /* from  https://moderncss.dev/custom-select-styles-with-pure-css/ */
  .select {
    appearance: none;
    background-color: transparent;
    border: none;
    padding: 0 1em 0 0;
    margin: 0;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
    cursor: inherit;
    line-height: inherit;

    outline: none;
  }

  .select::-ms-expand {
    display: none;
  }

  .select-wrapper {
    width: 100%;
    min-width: 15ch;
    max-width: 30ch;
    border: 1px solid#777;
    border-radius: 0.25em;
    padding: 0.25em 0.5em;
    font-size: 1.25rem;
    cursor: pointer;
    line-height: 1.1;
    background-color: #000;
    /* background-image: linear-gradient(to top, #000, #000 33%); */
    color: #fff;

    display: grid;
    grid-template-areas: 'select';
    align-items: center;
    position: relative;
  }

  .select-wrapper::after {
    content: '';
    width: 0.8em;
    height: 0.5em;
    background-color: #fff;
    clip-path: polygon(100% 0%, 0 0%, 50% 100%);
    justify-self: end;
  }

  .select,
  .select-wrapper:after {
    grid-area: select;
  }

  .select:focus + .focus {
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    border: 2px solid blue;
    border-radius: inherit;
  }
</style>

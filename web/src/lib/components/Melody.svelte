<script lang="ts">
  // import {VirtualContract} from '$lib/utils/ethereum';
  // import contractsInfo from '$lib/contracts.json';
  // import {AddressZero} from '@ethersproject/constants';
  import {wallet} from '$lib/stores/wallet';
  import {BigNumber} from '@ethersproject/bignumber';

  function encodeNote(bn: BigNumber, step: {note: number; vol: number; index: number; shape: number}): BigNumber {
    const shift = BigNumber.from(2).pow(241 - step.index * 15);
    const value = step.note + step.shape * 64 + step.vol * 64 * 8;
    const extra = shift.mul(value);
    return bn.add(extra);
  }

  let prom: Promise<{image: string; animation_url: string}>;
  let lastTime: number;

  function fetchURI(data1: string, data2: string): Promise<{image: string; animation_url: string}> {
    if (!wallet.contracts) {
      return Promise.reject('no contract');
    }

    if (prom && Date.now() - lastTime < 3000) {
      // TODO record
      return Promise.reject('waiting...');
    } else {
      lastTime = Date.now();
      prom = wallet.contracts.MeloBleepsTokenURI.wav(data1, data2).then((v) => {
        return JSON.parse(v.substr('data:application/json,'.length));
      });
    }

    return prom;
  }

  let volumes = Array.from(Array(32)).map((v, i) => {
    return {vol: 5, index: i};
  });

  let notes = Array.from(Array(32)).map((v, i) => {
    return {note: i * 2 + 2, index: i, shape: 6};
  });

  let steps = [];
  $: {
    steps = [];
    for (let i = 0; i < 32; i++) {
      steps.push({vol: volumes[i].vol, note: notes[i].note, index: i, shape: notes[i].shape});
    }
  }

  // let MeloBleepsTokenURI = contractsInfo.contracts.MeloBleepsTokenURI;
  // let virtualBleep = new VirtualContract(MeloBleepsTokenURI.abi, MeloBleepsTokenURI.linkedData.bytecode, AddressZero);

  $: data1 =
    '0x' +
    steps
      .slice(0, 16)
      .reduce((prev, curr, index) => encodeNote(prev, curr), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  $: data2 =
    '0x' +
    steps
      .slice(16)
      .reduce(
        (prev, curr, index) =>
          encodeNote(prev, {note: curr.note, index: curr.index - 16, vol: curr.vol, shape: curr.shape}),
        BigNumber.from(0)
      )
      .toHexString()
      .slice(2)
      .padStart(64, '0');

  let sound;

  function fetchSound() {
    sound = fetchURI(data1, data2);
    sound.then((s) => console.log(s.animation_url));
  }

  function getColor(note: {note: number; shape: number}): string {
    switch (note.shape) {
      case 0:
        return 'background-color: red';
      default:
        return 'background-color: black';
    }
  }
</script>

<div>
  {#each notes as note}
    <input
      class="m-1 w-4 h-96"
      style={`${getColor(note)}`}
      step="1"
      min="0"
      bind:value={note.note}
      on:change={() => (sound = null)}
      max="64"
      type="range"
      orient="vertical"
    />
  {/each}
</div>

<div>
  {#each notes as note}
    <button
      class="m-1 w-4 h-20"
      on:click={() => {
        note.shape = (note.shape + 1) % 8;
        sound = null;
      }}>{note.shape}</button
    >
  {/each}
</div>

<div>
  {#each volumes as volume}
    <input
      class="m-1 w-4 h-20"
      step="1"
      min="0"
      bind:value={volume.vol}
      on:change={() => (sound = null)}
      max="7"
      type="range"
      orient="vertical"
    />
  {/each}
</div>

<button on:click={fetchSound}>PLAY</button>

<p>
  {data1}
</p>

<p>
  {data2}
</p>

<p>
  {#if sound}
    {#await sound}
      ...
    {:then metadata}
      <audio src={metadata.animation_url} preload="auto" controls autoplay crossorigin="anonymous" />
    {:catch error}
      <p style="color: red">{error}</p>
    {/await}
  {/if}
</p>

<style>
  input[type='range'][orient='vertical'] {
    writing-mode: bt-lr; /* IE */
    -webkit-appearance: slider-vertical; /* WebKit */
  }
</style>

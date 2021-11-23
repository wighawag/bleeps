<script lang="ts">
  import {hashParams} from '$lib/config';

  import {flow, wallet} from '$lib/stores/wallet';
  import {BigNumber} from '@ethersproject/bignumber';
  import {onMount} from 'svelte';
  import Modal from './Modal.svelte';
  import GreenNavButton from './navigation/GreenNavButton.svelte';

  const testShape = 5;
  const testSong = [
    {vol: 5, note: 1, shape: testShape},
    {vol: 5, note: 3, shape: testShape},
    {vol: 5, note: 5, shape: testShape},
    {vol: 5, note: 7, shape: testShape},
    {vol: 5, note: 9, shape: testShape},
    {vol: 5, note: 11, shape: testShape},
    {vol: 5, note: 13, shape: testShape},
    {vol: 5, note: 15, shape: testShape},
    {vol: 5, note: 17, shape: testShape},
    {vol: 5, note: 19, shape: testShape},
    {vol: 5, note: 21, shape: testShape},
    {vol: 5, note: 23, shape: testShape},
    {vol: 5, note: 25, shape: testShape},
    {vol: 5, note: 27, shape: testShape},
    {vol: 5, note: 29, shape: testShape},
    {vol: 5, note: 31, shape: testShape},
    {vol: 5, note: 33, shape: testShape},
    {vol: 5, note: 35, shape: testShape},
    {vol: 5, note: 37, shape: testShape},
    {vol: 5, note: 39, shape: testShape},
    {vol: 5, note: 41, shape: testShape},
    {vol: 5, note: 43, shape: testShape},
    {vol: 5, note: 45, shape: testShape},
    {vol: 5, note: 47, shape: testShape},
    {vol: 5, note: 49, shape: testShape},
    {vol: 5, note: 51, shape: testShape},
    {vol: 5, note: 53, shape: testShape},
    {vol: 5, note: 55, shape: testShape},
    {vol: 5, note: 57, shape: testShape},
    {vol: 5, note: 59, shape: testShape},
    {vol: 5, note: 61, shape: testShape},
    {vol: 5, note: 63, shape: testShape},
  ];

  const song1 = [
    // new Bleeps sound
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 5, note: 63, shape: 7},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 5, note: 63, shape: 7},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 5, note: 63, shape: 7},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 0, note: 0, shape: 0},
    {vol: 5, note: 63, shape: 7},
    {vol: 0, note: 0, shape: 0},
    {vol: 7, note: 1, shape: 8},
    {vol: 5, note: 63, shape: 7},
  ];

  // const furelise = [
  //   // new Bleeps sound
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 27, shape: 0},
  //   {vol: 5, note: 27, shape: 0},
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 27, shape: 0},
  //   {vol: 5, note: 27, shape: 0},
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 28, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 26, shape: 0},
  //   {vol: 5, note: 26, shape: 0},
  //   {vol: 5, note: 24, shape: 0},
  //   {vol: 5, note: 24, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 12, shape: 0},
  //   {vol: 5, note: 12, shape: 0},
  //   {vol: 5, note: 16, shape: 0},
  //   {vol: 5, note: 16, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 21, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 23, shape: 0},
  //   {vol: 5, note: 16, shape: 0},
  //   {vol: 5, note: 16, shape: 0},

  //   //
  //   // {vol: 5, note: 24, shape: 0},
  //   // {vol: 5, note: 23, shape: 0},
  //   // {vol: 5, note: 28, shape: 0},
  //   // {vol: 5, note: 27, shape: 0},
  //   // {vol: 5, note: 28, shape: 0},
  //   // {vol: 5, note: 27, shape: 0},
  //   // {vol: 5, note: 28, shape: 0},
  //   // {vol: 5, note: 23, shape: 0},
  //   // {vol: 5, note: 26, shape: 0},
  //   // {vol: 5, note: 24, shape: 0},
  //   // {vol: 5, note: 21, shape: 0},
  //   // {vol: 5, note: 21, shape: 0},
  //   // {vol: 5, note: 12, shape: 0},
  //   // {vol: 5, note: 16, shape: 0},
  //   // {vol: 5, note: 21, shape: 0},
  //   // {vol: 5, note: 23, shape: 0},
  // ];

  const song2 = [
    {vol: 5, note: 46, shape: 6},
    {vol: 5, note: 55, shape: 6},
    {vol: 3, note: 46, shape: 6},
    {vol: 3, note: 55, shape: 6},
    {vol: 2, note: 46, shape: 6},
    {vol: 2, note: 55, shape: 6},
    {vol: 1, note: 46, shape: 6},
    {vol: 1, note: 55, shape: 6},
    {vol: 5, note: 34, shape: 6},
    {vol: 5, note: 44, shape: 6},
    {vol: 3, note: 44, shape: 6},
    {vol: 3, note: 34, shape: 6},
    {vol: 5, note: 31, shape: 6},
    {vol: 5, note: 36, shape: 6},
    {vol: 3, note: 31, shape: 6},
    {vol: 3, note: 36, shape: 6},
    {vol: 5, note: 33, shape: 6},
    {vol: 5, note: 40, shape: 6},
    {vol: 3, note: 33, shape: 6},
    {vol: 3, note: 40, shape: 6},
    {vol: 2, note: 33, shape: 6},
    {vol: 2, note: 40, shape: 6},
    {vol: 5, note: 42, shape: 6},
    {vol: 5, note: 50, shape: 6},
    {vol: 3, note: 42, shape: 6},
    {vol: 3, note: 50, shape: 6},
    {vol: 2, note: 42, shape: 6},
    {vol: 2, note: 50, shape: 6},
    {vol: 1, note: 42, shape: 6},
    {vol: 1, note: 50, shape: 6},
    {vol: 1, note: 42, shape: 6},
    {vol: 1, note: 50, shape: 6},
  ];

  const sfx1 = [
    {vol: 5, note: 20, shape: 0},
    {vol: 5, note: 20, shape: 0},
    {vol: 5, note: 35, shape: 0},
    {vol: 5, note: 50, shape: 0},
    {vol: 0, note: 46, shape: 0},
    {vol: 0, note: 55, shape: 0},
    {vol: 0, note: 46, shape: 0},
    {vol: 0, note: 55, shape: 0},
    {vol: 0, note: 34, shape: 0},
    {vol: 0, note: 44, shape: 0},
    {vol: 0, note: 44, shape: 0},
    {vol: 0, note: 34, shape: 0},
    {vol: 0, note: 31, shape: 0},
    {vol: 0, note: 36, shape: 0},
    {vol: 0, note: 31, shape: 0},
    {vol: 0, note: 36, shape: 0},
    {vol: 0, note: 33, shape: 0},
    {vol: 0, note: 40, shape: 0},
    {vol: 0, note: 33, shape: 0},
    {vol: 0, note: 40, shape: 0},
    {vol: 0, note: 33, shape: 0},
    {vol: 0, note: 40, shape: 0},
    {vol: 0, note: 42, shape: 0},
    {vol: 0, note: 50, shape: 0},
    {vol: 0, note: 42, shape: 0},
    {vol: 0, note: 50, shape: 0},
    {vol: 0, note: 42, shape: 0},
    {vol: 0, note: 50, shape: 0},
    {vol: 0, note: 42, shape: 0},
    {vol: 0, note: 50, shape: 0},
    {vol: 0, note: 42, shape: 0},
    {vol: 0, note: 50, shape: 0},
  ];

  function extractVolumes(song: {vol: number; note: number; shape: number}[]) {
    return song.map((v, i) => {
      return {vol: v.vol, index: i};
    });
  }

  function extractNotes(song: {vol: number; note: number; shape: number}[]) {
    return song.map((v, i) => {
      return {note: v.note, shape: v.shape, index: i};
    });
  }

  function encodeNote(bn: BigNumber, step: {note: number; vol: number; index: number; shape: number}): BigNumber {
    const shift = BigNumber.from(2).pow(240 - step.index * 16);
    const value = step.note + step.shape * 64 + step.vol * 64 * 16;
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

  let step: 'TX_CREATION' | 'TX_SUBMITTED' | 'IDLE' = 'IDLE';
  let error: string | undefined;

  function formatError(error): string {
    try {
      return JSON.stringify(error, null, '  ');
    } catch (e) {
      return e.message || e;
    }
  }

  function putForSale() {
    flow.execute(async (contracts) => {
      step = 'TX_CREATION';
      try {
        /*
        address payable artist,
        bytes32 data1,
        bytes32 data2,
        uint256 startPrice,
        uint256 endPrice,
        uint256 duration
        */
        const startPrice = '2000000000000000000';
        const endPrice = '200000000000000000';
        const duration = 7 * 24 * 3600;
        const tx = await contracts.MeloBleepsAuction.mint(wallet.address, data1, data2, startPrice, endPrice, duration);
        step = 'TX_SUBMITTED';
        await tx.wait();
        step = 'IDLE';
      } catch (e) {
        console.error(e);
        if (e?.message.indexOf('User denied') === -1) {
          error = formatError(e);
        }
        step = 'IDLE';
      }
    });
  }

  onMount(() => {
    let song = song1;
    const songNum = hashParams['song'];
    if (songNum) {
      if (songNum === '1') {
        song = song1;
      } else if (songNum === '2') {
        song = song2;
      } else if (songNum === 'test') {
        song = testSong;
      }
    }
    volumes = extractVolumes(song);
    notes = extractNotes(song);
  });

  let volumes = extractVolumes(testSong);

  // let notes = Array.from(Array(32)).map((v, i) => {
  //   return {note: i * 2 + 2, index: i, shape: 0};
  // });

  let notes = extractNotes(testSong);

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

  let global = 0;
</script>

<div>
  <p class="mx-auto">Notes</p>
  {#each notes as note}
    <input
      class="m-1 w-4 h-96"
      style={`${getColor(note)}`}
      step="1"
      min="0"
      bind:value={note.note}
      on:change={() => (sound = null)}
      max="63"
      type="range"
      orient="vertical"
    />
  {/each}
</div>

<div class="mt-3">
  <p class="mx-auto">
    Instruments (<button
      class="inline"
      on:click={() => {
        for (let i = 0; i < 32; i++) {
          notes[i].shape = global;
        }
        global = (global + 1) % 8;
        sound = null;
      }}>change all : {global}</button
    >)
  </p>
  {#each notes as note}
    <button
      class="my-0 mx-1 w-4 h-20"
      on:click={() => {
        note.shape = (note.shape + 1) % 8;
        sound = null;
      }}>{note.shape}</button
    >
  {/each}
</div>

<div class="mt-3">
  <p class="mx-auto">Volumes</p>
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

<div class="flex justify-center items-center">
  <p class="mx-auto">
    {#if sound}
      {#await sound}
        Please wait...
      {:then metadata}
        <h1 class="text-green-400 text-2xl">{metadata.name}</h1>
        <audio src={metadata.animation_url} preload="auto" controls autoplay crossorigin="anonymous" />
        <GreenNavButton class="m-4 w-32 mx-auto" label="Put For Sale" on:click={putForSale}>Put For Sale</GreenNavButton
        >
      {:catch error}
        <p style="color: red">{error}</p>
      {/await}
    {:else}
      <GreenNavButton class="w-32 mx-auto" label="Generate" on:click={fetchSound}>Generate</GreenNavButton>
    {/if}
  </p>
</div>

{#if error}
  <Modal on:close={() => (error = undefined)}>{error}</Modal>
{:else if step !== 'IDLE'}
  <Modal cancelable={false}>
    <div class="text-white">
      {#if step === 'TX_CREATION'}
        Transaction To Be Authorized...
      {:else}
        Waiting for transaction...
      {/if}
    </div>
  </Modal>
{/if}

<style>
  input[type='range'][orient='vertical'] {
    writing-mode: bt-lr; /* IE */
    -webkit-appearance: slider-vertical; /* WebKit */
    background-color: #333333;
  }

  input[type='range']::-webkit-slider-runnable-track {
    background-color: #333333;
  }

  input[type='range']::-webkit-slider-thumb {
    background-color: #333333;
  }
  /** FF*/
  input[type='range']::-moz-range-progress {
    background-color: #333333;
  }
  input[type='range']::-moz-range-track {
    background-color: #333333;
  }
  /* IE*/
  input[type='range']::-ms-fill-lower {
    background-color: #333333;
  }
  input[type='range']::-ms-fill-upper {
    background-color: #333333;
  }
</style>

<script lang="ts">
  import {hashParams} from '$lib/config';
  import {currentMelody} from '$lib/melodies/currentMelody';
  import Melody from '$lib/melodies/Melody.svelte';

  import {fallback, flow, wallet} from '$lib/stores/wallet';
  import {BigNumber} from '@ethersproject/bignumber';
  import {onMount} from 'svelte';
  import Modal from './Modal.svelte';
  import GreenNavButton from './navigation/GreenNavButton.svelte';

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

  function encodeNote(
    bn: BigNumber,
    slot: {note: number; volume: number; index: number; instrument: number}
  ): BigNumber {
    const shift = BigNumber.from(2).pow(240 - slot.index * 16);
    const value = slot.note + slot.instrument * 64 + slot.volume * 64 * 16;
    const extra = shift.mul(value);
    return bn.add(extra);
  }

  let prom: Promise<{image: string; animation_url: string}>;
  let lastTime: number;

  function fetchURI(data1: string, data2: string): Promise<{image: string; animation_url: string}> {
    const contracts = wallet.contracts || fallback.contracts;
    if (!contracts) {
      return Promise.reject('no contract');
    }

    if (prom && Date.now() - lastTime < 3000) {
      // TODO record
      return Promise.reject('waiting...');
    } else {
      lastTime = Date.now();
      prom = contracts.MeloBleepsTokenURI.wav(data1, data2).then((v) => {
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

  $: {
    console.log(`${$currentMelody.name} changed`);
    sound = null;
    // `${$currentMelody.name}~${$currentMelody.slots.map(
    //   (v) => `${v.note + (v.instrument << 6)}~${v.volume}`
    // ).join('~')}`;
  }

  $: data1 =
    '0x' +
    $currentMelody.slots
      .slice(0, 16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  $: data2 =
    '0x' +
    $currentMelody.slots
      .slice(16)
      .reduce((prev, curr, index) => encodeNote(prev, {...curr, index}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');

  let sound;

  function fetchSound() {
    if (typeof location !== 'undefined') {
      location.hash = `melody=${btoa(JSON.stringify($currentMelody))}`;
    }
    sound = fetchURI(data1, data2);
    sound.then((s) => console.log(s.animation_url));
  }
</script>

<Melody editable={true} />

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

<script lang="ts">
  import {hashParams} from '$lib/config';
  import {currentMelody, MelodyInfo, Slots} from '$lib/melodies/currentMelody';
  import Melody from '$lib/melodies/Melody.svelte';
  import {createEventDispatcher} from 'svelte';

  import {fallback, flow, wallet} from '$lib/blockchain/wallet';
  import {BigNumber} from '@ethersproject/bignumber';
  import {onMount} from 'svelte';
  import Modal from '$lib/components/styled/Modal.svelte';
  import GreenNavButton from '$lib/components/styled/navigation/GreenNavButton.svelte';
  import {encodeNote} from '$lib/utils/notes';

  const dispatch = createEventDispatcher<{tosave: MelodyInfo}>();

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

  let prom: Promise<{image: string; animation_url: string}>;
  let lastTime: number;

  function fetchURI(data1: string, data2: string, speed: number): Promise<{image: string; animation_url: string}> {
    const contracts = wallet.contracts || fallback.contracts;
    if (!contracts) {
      return Promise.reject('no contract');
    }

    if (prom && Date.now() - lastTime < 3000) {
      // TODO record
      return Promise.reject('waiting...');
    } else {
      lastTime = Date.now();
      prom = contracts.MeloBleepsTokenURI.wav(data1, data2, speed).then((v) => {
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
        const tx = await contracts.MeloBleepsAuctions.mint(
          wallet.address,
          data1,
          data2,
          startPrice,
          endPrice,
          duration
        );
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

  let lastMelody: MelodyInfo | undefined;
  $: {
    let diff = lastMelody == undefined;
    if (lastMelody) {
      if (lastMelody.speed !== $currentMelody.speed || lastMelody.name !== $currentMelody.name) {
        diff = true;
      } else {
        for (let i = 0; i < 32; i++) {
          const lslot = lastMelody.slots[i];
          const slot = $currentMelody.slots[i];
          if (
            slot.volume !== lslot.volume ||
            (slot.volume > 0 && (slot.instrument !== lslot.instrument || slot.note !== lslot.note))
          ) {
            diff = true;
            break;
          }
        }
      }
    }
    if (diff) {
      lastMelody = {
        name: $currentMelody.name,
        slots: $currentMelody.slots.map((v) => {
          return {
            ...v,
          };
        }) as Slots,
        speed: $currentMelody.speed,
      };
      sound = null;
      // `${$currentMelody.name}~${$currentMelody.slots.map(
      //   (v) => `${v.note + (v.instrument << 6)}~${v.volume}`
      // ).join('~')}`;
    }
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

  $: {
    console.log(`data1 : ${data1}`);
    console.log(`data2 : ${data2}`);
  }

  let sound;

  function fetchSound() {
    dispatch('tosave', $currentMelody);
    // console.log({speed: $currentMelody.speed});
    sound = fetchURI(data1, data2, $currentMelody.speed);
    sound.then((s) => console.log(s.animation_url));
  }

  let graphView = true;
</script>

<Melody editable={true} {graphView} />

<div class="absolute top-16 right-2">
  <div
    class={`relative rounded-full w-12 h-6 transition duration-200 ease-linear ${
      graphView ? 'bg-green-400' : 'bg-gray-400'
    }`}
  >
    <label
      for="toggle"
      class={`absolute left-0 bg-white border-2 mb-2 w-6 h-6 rounded-full transition transform duration-100 ease-linear cursor-pointer ${
        graphView ? 'bg-green-400 translate-x-full' : 'bg-gray-400 translate-x-0'
      }`}
    />
    <input
      type="checkbox"
      id="toggle"
      name="toggle"
      on:click={() => (graphView = !graphView)}
      class={`appearance-none w-full h-full active:outline-none focus:outline-none`}
    />
  </div>
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

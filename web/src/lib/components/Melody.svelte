<script lang="ts">
  // import {VirtualContract} from '$lib/utils/ethereum';
  // import contractsInfo from '$lib/contracts.json';
  // import {AddressZero} from '@ethersproject/constants';
  import {wallet} from '$lib/stores/wallet';
  import {BigNumber} from '@ethersproject/bignumber';

  function encodeNote(bn: BigNumber, step: {note: number; index: number}): BigNumber {
    const shift = BigNumber.from(2).pow(242 - step.index * 14);
    const value = shift.mul(step.note);
    return bn.add(value);
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
      prom = wallet.contracts.Bleeps.wav(data1, data2).then((v) => {
        return JSON.parse(v.substr('data:application/json,'.length));
      });
    }

    return prom;
  }

  let steps = Array.from(Array(32)).map((v, i) => {
    return {note: i * 2 + 2, index: i};
  });

  // let Bleeps = contractsInfo.contracts.Bleeps;
  // let virtualBleep = new VirtualContract(Bleeps.abi, Bleeps.linkedData.bytecode, AddressZero);

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
      .reduce((prev, curr, index) => encodeNote(prev, {note: curr.note, index: curr.index - 16}), BigNumber.from(0))
      .toHexString()
      .slice(2)
      .padStart(64, '0');

  let sound;

  function fetchSound() {
    sound = fetchURI(data1, data2);
    sound.then((s) => console.log(s.animation_url));
  }
</script>

<div>
  {#each steps as step}
    <input class="m-1 w-4 h-96" step="1" min="0" bind:value={step.note} max="64" type="range" orient="vertical" />
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

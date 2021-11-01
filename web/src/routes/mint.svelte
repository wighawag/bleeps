<script context="module">
  // export const hydrate = false;
</script>

<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import GreenNavButton from '$lib/components/navigation/GreenNavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/stores/wallet';
  import Modal from '$lib/components/Modal.svelte';
  import {ownersState} from '$lib/stores/owners';
  import {base} from '$app/paths';

  const name = 'Bleeps and The Bleeps DAO';

  let step: 'FETCHING_LAST_PRICE' | 'TX_CREATION' | 'TX_SBUMITTED' | 'IDLE' = 'IDLE';
  let error: string | undefined;

  let selected = undefined;

  function fetchURI(id: number): Promise<{image: string; animation_url: string}> {
    const contracts = wallet.contracts || fallback.contracts;
    if (!contracts) {
      return Promise.reject('no contract');
    }
    return contracts.Bleeps.tokenURI(id)
      .then((v) => {
        return fetch(v).then((r) => r.json());
        // return JSON.parse(v.substr('data:application/json,'.length));
      })
      .catch((e) => {
        console.log(e);
      });
  }

  let sound;

  function select(bleepId) {
    console.log({bleepId});
    selected = bleepId;
    sound = fetchURI(bleepId);
    // sound.then((s) => console.log(s.animation_url));
  }

  function formatError(error): string {
    try {
      return JSON.stringify(error, null, '  ');
    } catch (e) {
      return e.message || e;
    }
  }

  async function mint(bleepId: string) {
    flow.execute(async (contracts) => {
      step = 'FETCHING_LAST_PRICE';
      await ownersState.waitFirstPriceInfo;
      step = 'TX_CREATION';
      try {
        const tx = await contracts.BleepsInitialSale.mint(bleepId, wallet.address, {
          value: $ownersState.expectedValue,
        });
        step = 'TX_SBUMITTED';
        await tx.wait();
        step = 'IDLE';
      } catch (e) {
        if (e?.message && e?.message.indexOf('User denied') === -1) {
          error = formatError(e);
        }
        step = 'IDLE';
      }
    });
  }

  function instrumentNameFromId(id: number): string {
    return instrumentName(id >> 6);
  }

  function instrumentName(instr: number): string {
    switch (instr) {
      case 0:
        return 'TRIANGLE';
      case 1:
        return 'TILTED SAW';
      case 2:
        return 'SAW';
      case 3:
        return 'SQUARE';
      case 4:
        return 'PULSE';
      case 5:
        return 'ORGAN';
      case 6:
        return 'NOISE';
      case 7:
        return 'PHASER';
      case 8:
        return 'FUNKY SAW';
    }
    return 'NONE';
  }

  function noteName(id: number): string {
    const note = id % 64;
    const m = note % 12;
    let n = m;
    if (m > 0) {
      n--;
    }
    if (m > 2) {
      n--;
    }
    if (m > 5) {
      n--;
    }
    if (m > 7) {
      n--;
    }
    if (m > 9) {
      n--;
    }
    let str = '_';
    str = String.fromCharCode(65 + ((n + 2) % 7));
    if (m == 1 || m == 3 || m == 6 || m == 8 || m == 10) {
      str += '#';
    }
    str += String.fromCharCode(50 + Math.floor(note / 12));
    return str;
  }

  const notes = [
    65.41, // C2
    69.3, // C#2
    73.42, // D2
    77.78, // D#2
    82.41, // E2
    87.31, // F2
    92.5, // F#2
    98.0, // G2
    103.83, // G#2
    110.0, // A2
    116.54, // A#2
    123.47, // B2
    130.81, // C3
    138.59, // C#3
    146.83, // D3
    155.56, // D#3
    164.81, // E3
    174.61, // F3
    185.0, // F#3
    196.0, // G3
    207.65, // G#3
    220.0, // A3
    233.08, // A#3
    246.94, // B3
    261.63, // C4
    277.18, // C#4
    293.66, // D4
    311.13, // D#4
    329.63, // E4
    349.23, // F4
    369.99, // F#4
    392.0, // G4
    415.3, // G#4
    440.0, // A4
    466.16, // A#4
    493.88, // B4
    523.25, // C5
    554.37, // C#5
    587.33, // D5
    622.25, // D#5
    659.25, // E5
    698.46, // F5
    739.99, // F#5
    783.99, // G5
    830.61, // G#5
    880.0, // A5
    932.33, // A#5
    987.77, // B5
    1046.5, // C6
    1108.73, // C#6
    1174.66, // D6
    1244.51, // D#6
    1318.51, // E6
    1396.91, // F6
    1479.98, // F#6
    1567.98, // G6
    1661.22, // G#6
    1760.0, // A6
    1864.66, // A#6
    1975.53, // B6
    2093.0, // C7
    2217.46, // C#7
    2349.32, // D7
    2489.02, // D#7
    2637.02, // E7
    2793.83, // F7
    2959.96, // F#7
    3135.96, // G7
    3322.44, // G#7
    3520.0, // A7
    3729.31, // A#7
    3951.07, // B7
    4186.01, // C8
    4434.92, // C#8
    4698.63, // D8
    4978.03, // D#8
    5274.04, // E8
    5587.65, // F8
    5919.91, // F#8
    6271.93, // G8
    6644.88, // G#8
    7040.0, // A8
    7458.62, // A#8
    7902.13, // B8
  ];

  function hertz(id: number): string {
    const note = id % 64;
    return '' + Math.floor(notes[note]) + ' Hz';
  }
</script>

<!-- {$ownersState.state} TODO show loading  -->
<section class="px-4 text-center">
  <div class="mx-auto">
    <img
      class="mb-4 mx-auto"
      src={`${base}/images/logo.svg`}
      alt={name}
      style="width:128px;height:128px;"
      width="128px"
      height="128px"
    />

    {#if $chain.state === 'Ready' || $fallback.state === 'Ready'}
      {#if $ownersState?.expectedValue}
        {#if $ownersState?.priceInfo.hasMandalas}
          <p class="text-green-600 mb-2">
            As a owner of mandalas, you got a {$ownersState.priceInfo.mandalasDiscountPercentage}% discount!
          </p>
        {/if}
      {/if}

      <div class="">
        <div class="inline-block border-white md:w-64 w-32 md:h-24 h-16 border-2 mx-auto rounded-md">
          {#if $ownersState?.numLeftPerInstr !== undefined}
            <div
              style={`width:${
                $ownersState?.numLeft !== 448 ? Math.max(((448 - $ownersState?.numLeft) * 100) / 448, 5) : 0
              }%; background-color:#dab894;height:100%;position:relative;line-height:inherit;`}
            />
          {:else}
            <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
          {/if}
        </div>
        <div class="inline-block border-white border md:w-24 w-12 md:h-24 h-16 border-2 mx-auto rounded-md">
          <p class="absolute my-8 mx-3 invisible md:visible">reserved</p>
          <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
        </div>
        <!-- <div class="inline-block border-white border-dashed md:w-64 w-32 md:h-24 h-16 border-2 mx-auto rounded-md">
        <p class="absolute m-8 invisible md:visible">Owned By Bleeps DAO</p>
        <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
      </div> -->
      </div>

      <div>
        <div class="inline-block md:w-64 w-32 mx-auto">
          {#if $ownersState?.numLeft !== undefined}
            <p class="text-yellow-400">{448 - $ownersState?.numLeft} / 448 Minted</p>
          {/if}
        </div>
        <div class="inline-block md:w-24 w-12 mx-auto">
          <p>+128</p>
        </div>
        <!-- <div class="inline-block md:w-64 w-32 mx-auto">
        <p>(+448)</p>
      </div> -->
      </div>

      <div class="mb-8">
        <div class="inline-block md:w-64 w-32 mx-auto">
          <p class="text-bleeps">
            {#if $ownersState?.expectedValue}
              Current Price: {$ownersState?.expectedValue.div('1000000000000000').toNumber() / 1000} ETH
              {#if $ownersState?.priceInfo.hasMandalas}
                <span class="text-gray-500"
                  >(instead of {$ownersState?.normalExpectedValue.div('1000000000000000').toNumber() / 1000} ETH)</span
                >
              {/if}
            {/if}
          </p>
        </div>
        <div class="inline-block md:w-24 w-12 mx-auto" />
        <!-- <div class="inline-block md:w-64 w-32 mx-auto" /> -->
      </div>
    {/if}
  </div>
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $chain.state === 'Ready' || $fallback.state === 'Ready'}
      <!-- <GreenNavButton
        class="w-24 mx-auto"
        label="Connect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => flow.connect()}
      >
        Mint
      </GreenNavButton> -->

      <div class="max-w-2xl mx-auto py-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <div>
          {#each Array.from(Array(9)).map((v, i) => i) as instr}
            <h2 class="mx-auto">{instrumentName(instr)}</h2>
            <div class="border-white w-32 h-16 border-2 mx-auto rounded-md">
              {#if $ownersState?.numLeftPerInstr !== undefined}
                <div
                  style={`width:${
                    $ownersState?.numLeftPerInstr[instr] !== 64
                      ? Math.max(((64 - $ownersState?.numLeftPerInstr[instr]) * 100) / 64, 5)
                      : 0
                  }%; background-color:#dab894;height:100%;position:relative;line-height:inherit;`}
                />
              {:else}
                <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
              {/if}
            </div>

            {#if $ownersState?.numLeftPerInstr !== undefined}
              <p>{64 - $ownersState.numLeftPerInstr[instr]} / 64 Minted</p>
            {/if}

            <div class="grid grid-cols-8 mx-auto p-1 mb-16 gap-1 sm:gap-2 md:gap-4">
              {#each Array.from(Array(64)).map((v, i) => i + instr * 64) as bleepId}
                <div>
                  <!-- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style="background-color:#000;">
                    <rect x="0" width="32" height="32" rx="4" style="stroke-width:0.5;stroke:#dab894" />
                    <text
                      x="16"
                      y="16"
                      dominant-baseline="middle"
                      text-anchor="middle"
                      style="fill: #dab894; font-size: 6px;">{noteName(bleepId)}</text
                    ></svg
                  > -->

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    style="background-color:#000; cursor:pointer;"
                    on:click={() => select(bleepId)}
                  >
                    <rect
                      x="0"
                      width="512"
                      height="512"
                      rx="64"
                      style={`stroke-width:8;stroke:${
                        $ownersState?.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'
                          ? '#dab894'
                          : '#fff'
                      }`}
                    />
                    <text
                      x="30"
                      y="30"
                      dominant-baseline="hanging"
                      text-anchor="start"
                      style={`fill: ${
                        $ownersState?.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'
                          ? '#dab894'
                          : '#fff'
                      }; font-size: 32px;`}>{hertz(bleepId)}</text
                    >
                    <g transform="translate(210,130) scale(0.2,0.2)"
                      ><path
                        d="M209.094 19.53L150.53 35.22l234.19 234.186 11.436 11.47-15.625 4.187-182.25 48.78L184 387.032l307.78-82.467.408-1.5L209.094 19.53zm-77.75 22.94L25.78 436.31l45.376 45.375 87.375-326.062 4.19-15.656 11.436 11.468 133.688 133.718 52.22-13.97L131.343 42.47zm41.062 133.655L87.53 492.845l381.126-102.126 17.53-65.314L173.22 409.28l-15.657 4.19 4.218-15.658 49.126-183.156-38.5-38.53z"
                        fill={$ownersState?.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'
                          ? '#dab894'
                          : '#fff'}
                        fill-opacity="1"
                      /></g
                    >
                    <text
                      x="256"
                      y="330"
                      dominant-baseline="middle"
                      text-anchor="middle"
                      style={`fill: ${
                        $ownersState?.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'
                          ? '#dab894'
                          : '#fff'
                      }; font-size: 72px;`}>{noteName(bleepId)}</text
                    ></svg
                  >

                  <!-- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="height: 512px; width: 512px;"
                    ><path d="M0 0h512v512H0z" fill="#fff" fill-opacity="1" /><g
                      class=""
                      transform="translate(0,0)"
                      style=""
                      ><path
                        d="M209.094 19.53L150.53 35.22l234.19 234.186 11.436 11.47-15.625 4.187-182.25 48.78L184 387.032l307.78-82.467.408-1.5L209.094 19.53zm-77.75 22.94L25.78 436.31l45.376 45.375 87.375-326.062 4.19-15.656 11.436 11.468 133.688 133.718 52.22-13.97L131.343 42.47zm41.062 133.655L87.53 492.845l381.126-102.126 17.53-65.314L173.22 409.28l-15.657 4.19 4.218-15.658 49.126-183.156-38.5-38.53z"
                        fill="#000"
                        fill-opacity="1"
                      /></g
                    ></svg
                  > -->
                  <!-- {#if $ownersState.tokenOwners && $ownersState.tokenOwners[bleepId]}
                    {#if $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'}
                      <NavButton label="listen" on:click={() => select(bleepId)}>listen</NavButton>
                    {:else}
                      <GreenNavButton label="listen" on:click={() => select(bleepId)}>listen</GreenNavButton>
                    {/if}
                  {:else}
                    <GreenNavButton label="listen" on:click={() => select(bleepId)}>listen</GreenNavButton>
                  {/if} -->

                  <!-- More products... -->
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <p class="m-6 text-gray-500 dark:text-gray-400 text-xl">Please connect to interact</p>

      <NavButton
        class="w-24 mx-auto"
        label="Connect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => flow.connect()}
      >
        Connect
      </NavButton>
    {/if}
  </WalletAccess>
</div>

{#if typeof selected !== 'undefined'}
  <Modal on:close={() => (selected = undefined)}>
    <div class="text-white">
      {#if sound}
        {#await sound}
          <h2 class="text-2xl">Loading {instrumentNameFromId(selected)} {noteName(selected)}....</h2>
          <!-- Loading Sound, please wait... -->
        {:then metadata}
          <!-- <h1 class="text-green-400 text-2xl">{metadata.name}</h1> -->
          <img src={metadata.image} alt={metadata.name} />
          <audio
            src={metadata.animation_url}
            preload="auto"
            controls
            autoplay
            crossorigin="anonymous"
            class="mx-auto m-2"
          />
        {:catch error}
          <p style="color: red">{formatError(error)}</p>
        {/await}
      {/if}
      <GreenNavButton
        label="mint"
        active={$ownersState.tokenOwners &&
          $ownersState.tokenOwners[selected] === '0x0000000000000000000000000000000000000000'}
        disabled={$ownersState.tokenOwners &&
          $ownersState.tokenOwners[selected] !== '0x0000000000000000000000000000000000000000'}
        on:click={() => {
          if (
            $ownersState.tokenOwners &&
            $ownersState.tokenOwners[selected] === '0x0000000000000000000000000000000000000000'
          ) {
            mint(selected);
            selected = undefined;
          }
        }}>mint</GreenNavButton
      >
    </div>
  </Modal>
{/if}
{#if error}
  <Modal on:close={() => (error = undefined)}>{error}</Modal>
{:else if step !== 'IDLE'}
  <Modal cancelable={false}>
    <div class="text-white">
      {#if step === 'TX_CREATION'}
        Transaction To Be Authorized...
      {:else if step === 'FETCHING_LAST_PRICE'}
        Fetching Latest Price....
      {:else}
        Waiting for transaction...
      {/if}
    </div>
  </Modal>
{/if}

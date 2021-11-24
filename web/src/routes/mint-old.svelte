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
  import BleepsSvg from '$lib/components/BleepsSVG.svelte';
  import {instrumentName, instrumentNameFromId, noteName} from '$lib/utils/notes';

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
              <!-- {#if $ownersState?.priceInfo.hasMandalas}
                <span class="text-gray-500"
                  >(instead of {$ownersState?.normalExpectedValue.div('1000000000000000').toNumber() / 1000} ETH)</span
                >
              {/if} -->
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

                  <BleepsSvg
                    id={bleepId}
                    minted={$ownersState?.tokenOwners &&
                      $ownersState.tokenOwners[bleepId] &&
                      $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'}
                    on:click={() => select(bleepId)}
                  />

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

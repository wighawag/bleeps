<script lang="ts">
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import NavButton from '$lib/components/styled/navigation/NavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/blockchain/wallet';
  import Modal from '$lib/components/styled/Modal.svelte';
  import {displayAddress} from '$lib/utils';
  import {fallbackProviderOrUrl, hashParams} from '$lib/config';
  import type {Melody} from '$lib/stores/melodies';
  import {MelodyAuction, today} from '$lib/stores/today';
  import MelodyView from '$lib/melodies/MelodyView.svelte';
  import {writable} from 'svelte/store';
  import {decodeMelodyFromData} from '$lib/melodies/currentMelody';
  import {onMount} from 'svelte';
  import {parseEther} from '@ethersproject/units';
  import type {JsonRpcProvider} from '@ethersproject/providers';

  onMount(() => {
    const deltaString = hashParams['delta'];
    if (deltaString) {
      let deltaAsNumber = 0;
      if (deltaString.endsWith('d')) {
        deltaAsNumber = parseInt(deltaString.slice(0, deltaString.length - 1)) * 24 * 3600;
      } else if (deltaString.endsWith('h')) {
        deltaAsNumber = parseInt(deltaString.slice(0, deltaString.length - 1)) * 3600;
      }
      if (!isNaN(deltaAsNumber)) {
        console.log(`delta: ${deltaString} (${deltaAsNumber})`);
        today.setDelta(deltaAsNumber);
      }
    }
  });

  let selected: MelodyAuction = undefined;

  function fetchURI(id: number): Promise<{image: string; animation_url: string}> {
    const contracts = wallet.contracts || fallback.contracts;
    if (!contracts) {
      return Promise.reject('no contract');
    }
    return contracts.MeloBleeps.tokenURI(id)
      .then((v) => {
        return fetch(v).then((r) => r.json());
        // return JSON.parse(v.substr('data:application/json,'.length));
      })
      .catch((e) => {
        console.log(e);
      });
  }

  let sound;

  function select(melody) {
    console.log({melodyID: melody.id});
    selected = melody;
    sound = fetchURI(melody.id);
    // sound.then((s) => console.log(s.animation_url));
  }

  function formatError(error): string {
    if (error.message) {
      return error.message;
    }
    try {
      return JSON.stringify(error, null, '  ');
    } catch (e) {
      return error.message || error;
    }
  }

  let amountInETH: number = 0.1;
  let step: 'TX_CREATION' | 'TX_SUBMITTED' | 'IDLE' = 'IDLE';
  let error: string | undefined;

  function bid(auction: MelodyAuction) {
    const value = parseEther('' + amountInETH);
    flow.execute(async (contracts) => {
      step = 'TX_CREATION';
      try {
        const tx = await contracts.MeloBleepsAuctions.bid(auction.id, $wallet.address, {value});
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

  async function increaseTime(numberOfSeconds: number) {
    let block = await wallet.fallbackProvider.getBlock('latest');
    console.log({currentBlockTime: block.timestamp});
    const result = await (wallet.fallbackProvider as JsonRpcProvider).send('evm_increaseTime', [numberOfSeconds]);
    console.log({result});
    block = await wallet.fallbackProvider.getBlock('latest');
    console.log({newBlockTime: block.timestamp});
  }
</script>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $chain.state === 'Ready' || $fallback.state === 'Ready' || fallbackProviderOrUrl}
      <!-- <GreenNavButton
        class="w-24 mx-auto"
        label="Connect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => flow.connect()}
      >
        Mint
      </GreenNavButton> -->

      {#if $today.step === 'LOADING'}
        Loading
      {:else if $today.step === 'IDLE'}
        Idle
      {:else if !$today.data}
        No Data
      {:else if $today.data.length === 0}
        <button class="border-2 border-bleeps p-2 block" on:click={() => increaseTime(12 * 3600)}>add 12h</button>
        No Sale Today, come back tomorrow
      {:else}
        <div class="max-w-2xl mx-auto py-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div>
            <ul
              role="list"
              class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8"
            >
              {#each $today.data as auction}
                <li class="relative">
                  <div class="group block w-full  rounded-lg overflow-hidden" style="width:320px; height:320px;">
                    <!-- <img src="https://images.unsplash.com/photo-1582053433976-25c00369fc93?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=512&q=80" alt="" class="object-cover pointer-events-none group-hover:opacity-75"> -->
                    <MelodyView
                      volumeHeight={28}
                      middleGap={28}
                      slotHeight={224}
                      nameFontSize={14}
                      creatorFontSize={5}
                      melody={writable(decodeMelodyFromData(auction.melody))}
                      editable={false}
                      on:click={() => select(auction)}
                    />
                    <!-- <button type="button" class="absolute inset-0 focus:outline-none">
                  <span class="sr-only">View details for IMG_4985.HEIC</span>
                </button> -->
                  </div>
                  <!-- <p class="mt-2 block text-sm font-medium text-gray-900 truncate pointer-events-none">IMG_4985.HEIC</p>
              <p class="block text-sm font-medium text-gray-500 pointer-events-none">3.9 MB</p> -->
                </li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}
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
    <div class="text-white w-80 h-80 md:w-96 md:h-96">
      {#if sound}
        {#await sound}
          <h2 class="text-2xl">Loading {selected.melody.name}....</h2>
          <div class="h-64 w-64" />
          <!-- Loading Sound, please wait... -->
        {:then metadata}
          <!-- <h1 class="text-green-400 text-2xl">{metadata.name}</h1> -->
          <img src={metadata.image} alt={metadata.name} class="w-56 h-56 mx-auto" />
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

      {#if selected && selected.melody.owner}
        <div class="border-2 border-bleeps p-2 rounded-md">
          Owned by {displayAddress(selected.melody.owner?.id, 20)}
        </div>
      {/if}

      <p>Bid</p>
      <input min="0.1" value="0.1" step="0.1" type="number" />
      <button on:click={() => bid(selected)} class="bg-black"> bid </button>
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
      {:else}
        Waiting for transaction...
      {/if}
    </div>
  </Modal>
{/if}

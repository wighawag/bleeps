<script context="module">
  // export const hydrate = false;
</script>

<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import GreenNavButton from '$lib/components/navigation/GreenNavButton.svelte';
  import {wallet, flow, chain} from '$lib/stores/wallet';
  import Modal from '$lib/components/Modal.svelte';
  import {ownersState} from '$lib/stores/owners';

  const name = 'Bleeps and The Bleeps DAO';

  let step: 'TX_CREATION' | 'TX_SBUMITTED' | 'IDLE' = 'IDLE';
  let error: string | undefined;

  let selected = undefined;

  function fetchURI(id: number): Promise<{image: string; animation_url: string}> {
    if (!wallet.contracts) {
      return Promise.reject('no contract');
    }
    return wallet.contracts.BleepsTokenURI.wav(id).then((v) => {
      return fetch(v).then((r) => r.json());
      // return JSON.parse(v.substr('data:application/json,'.length));
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
      step = 'TX_CREATION';
      try {
        const tx = await contracts.Bleeps.mint(bleepId, wallet.address, {
          value: $ownersState.expectedValue,
        });
        step = 'TX_SBUMITTED';
        await tx.wait();
        step = 'IDLE';
      } catch (e) {
        if (e?.message.indexOf('User denied') === -1) {
          error = formatError(e);
        }
        step = 'IDLE';
      }
    });
  }
</script>

{$ownersState.state}
<section class="py-2 px-4 text-center">
  <div class="max-w-auto md:max-w-lg mx-auto">
    <img
      class="mb-8 mx-auto"
      src="images/logo.svg"
      alt={name}
      style="width:256px;height:256px;"
      width="256px"
      height="256px"
    />
    <h2 class="text-5xl mb-2 font-heading text-black dark:text-white">
      {name}
    </h2>
    <p class="m-6 text-gray-500 dark:text-gray-400 text-xl">Sound Generated entirely from Solidity</p>

    <p class="m-6 text-gray-500 dark:text-gray-200 text-xl">Mint the Primitive Sounds and be part of the Bleeps DAO</p>

    <p class="m-6 text-gray-500 dark:text-gray-200 text-xl">
      You ll then receive proceeds from the auction sale of melodies (WIP)
    </p>

    <p class="text-yellow-400">
      Sale Comming Soon... follow :<a class="underline" href="https://twitter.com/wighawag">wighawag</a>
    </p>

    <!-- {#if $ownersState?.expectedValue}
      <p class="text-yellow-400">
        Current Price: {$ownersState?.expectedValue.div('1000000000000000').toNumber() / 1000}
      </p>
    {/if}

    {#if $ownersState?.numLeft !== undefined}
      <p class="text-yellow-400">{$ownersState?.numLeft} / 512 left</p>
    {/if} -->
  </div>
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $wallet.state === 'Ready' && $chain.state === 'Ready'}
      <!-- <GreenNavButton
        class="w-24 mx-auto"
        label="Connect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => flow.connect()}
      >
        Mint
      </GreenNavButton> -->

      <!-- <div class="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
        <div class="grid grid-cols-8 mx-auto">
          {#each Array.from(Array(512))
            .map((v, i) => i)
            .filter((v) => v < 6 * 64 || v >= 7 * 64) as bleepId}
            <div>
              <img
                class="group mb-8 mx-auto"
                src="images/logo.svg"
                alt={'' + bleepId}
                style="width:32px;height:32px;"
                width="32px"
                height="32px"
              />
              {#if $ownersState.tokenOwners && $ownersState.tokenOwners[bleepId]}
                {#if $ownersState.tokenOwners[bleepId] !== '0x0000000000000000000000000000000000000000'}
                  <NavButton label="listen" on:click={() => select(bleepId)}>listen</NavButton>
                {:else}
                  <GreenNavButton label="listen" on:click={() => select(bleepId)}>listen</GreenNavButton>
                {/if}
              {:else}
                <GreenNavButton label="listen" on:click={() => select(bleepId)}>listen</GreenNavButton>
              {/if}

            </div>
          {/each}
        </div>
      </div> -->
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
          Loading Sound, please wait...
        {:then metadata}
          <h1 class="text-green-400 text-2xl">{metadata.name}</h1>
          <audio src={metadata.animation_url} preload="auto" controls autoplay crossorigin="anonymous" />
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
        Fetching Latest Price....
      {:else}
        Waiting for transaction...
      {/if}
    </div>
  </Modal>
{/if}

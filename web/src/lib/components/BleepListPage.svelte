<script lang="ts">
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import NavButton from '$lib/components/styled/navigation/NavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/blockchain/wallet';
  import Modal from '$lib/components/styled/Modal.svelte';
  import {ownersState} from '$lib/stores/owners';
  import {base} from '$app/paths';
  import BleepsSvg from '$lib/components/BleepsSVG.svelte';
  import {colorFromId, instrumentName, instrumentNameFromId, noteName} from '$lib/utils/notes';
  import {displayAddress} from '$lib/utils';
  import {fallbackProviderOrUrl} from '$lib/config';

  const name = 'Bleeps and The Bleeps DAO';

  let selected: number | undefined = undefined;

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
    if (error.message) {
      return error.message;
    }
    try {
      return JSON.stringify(error, null, '  ');
    } catch (e) {
      return error.message || error;
    }
  }
</script>

<section class="px-4 text-center font-black">
  <div class="mx-auto">
    <img
      class="mb-4 mx-auto"
      src={`${base}/images/logo.svg`}
      alt={name}
      style="width:128px;height:128px;"
      width="128px"
      height="128px"
    />

    <a href="https://opensea.io/collection/bleeps" class="mt-4 underline inline-block">On Opensea</a>

    <!-- {#if $ownersState.state === 'Loading'}
      <p class="text-blue-600 text-xl m-4">Loading...</p>
    {/if} -->

    {#if $ownersState?.daoTreasury !== undefined}
      <p class="text-bleeps mt-8 font-black">
        Bleeps DAO Treasury: {$ownersState?.daoTreasury.div('1000000000000000').toNumber() / 1000} ETH
      </p>
    {/if}
  </div>
</section>

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

      <div class="max-w-2xl mx-auto py-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <div>
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as instr}
            <div id={`instr_${instr}`} style={`color: #${colorFromId(instr << 6)}`}>
              <!-- <h2 class="mx-auto">{instrumentName(instr)}</h2> -->

              <div
                class="w-32 h-16 border-2 mx-auto rounded-md m-4"
                style={`border: solid #${colorFromId(instr << 6)}`}
              >
                <p class="z-30 absolute my-5 mx-3 w-24 h-24">
                  {instrumentName(instr)}
                </p>

                <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
              </div>

              <div class="grid grid-cols-8 mx-auto p-1 mb-16 gap-1 sm:gap-2 md:gap-4">
                {#each Array.from(Array(64)).map((v, i) => i + instr * 64) as bleepId}
                  <div>
                    <BleepsSvg
                      owner={$ownersState.tokenOwners ? $ownersState.tokenOwners[bleepId]?.address : undefined}
                      id={bleepId}
                      your={$ownersState.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId].address.toLowerCase() === $wallet.address?.toLowerCase()}
                      on:click={() => select(bleepId)}
                    />
                  </div>
                {/each}
              </div>
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
    <div class="text-white w-80 h-80 md:w-96 md:h-96">
      {#if sound}
        {#await sound}
          <h2 class="text-2xl">Loading {instrumentNameFromId(selected)} {noteName(selected)}....</h2>
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

      {#if $ownersState.tokenOwners && $ownersState.tokenOwners[selected].address !== '0x0000000000000000000000000000000000000000'}
        <div class="border-2 border-bleeps p-2 rounded-md">
          Owned by {displayAddress($ownersState.tokenOwners[selected].address, 20)}
        </div>
      {:else}{/if}
    </div>
  </Modal>
{/if}

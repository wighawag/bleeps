<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/stores/wallet';
  import {instrumentName, instrumentNameFromId, noteName} from '$lib/utils/notes';
  import {onMount} from 'svelte';
  import {hashParams} from '$lib/config';

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

  let selected;
  let sound;

  onMount(() => {
    selected = hashParams['id'];
  });

  chain.subscribe(($chain) => {
    if (!sound && $chain.state === 'Ready') {
      sound = fetchURI(selected);
    }
  });

  fallback.subscribe(($fallback) => {
    if (!sound && $fallback.state === 'Ready') {
      sound = fetchURI(selected);
    }
  });

  function formatError(error): string {
    try {
      return JSON.stringify(error, null, '  ');
    } catch (e) {
      return e.message || e;
    }
  }
</script>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $chain.state === 'Ready' || $fallback.state === 'Ready'}
      <!-- TODO pregenerate all sounds as wav so it can always be viewable without a node-->

      {#if sound}
        {#await sound}
          <h2 class="text-2xl">Loading {instrumentNameFromId(selected)} {noteName(selected)}....</h2>
          <!-- Loading Sound, please wait... -->
        {:then metadata}
          <!-- <h1 class="text-green-400 text-2xl">{metadata.name}</h1> -->

          <img src={metadata.image} alt={metadata.name} class="mx-auto w-64 h-64 my-8" />
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

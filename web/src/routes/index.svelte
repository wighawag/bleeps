<script context="module">
  // export const hydrate = false;
</script>

<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import GreenNavButton from '$lib/components/navigation/GreenNavButton.svelte';
  import Blockie from '$lib/components/Blockie.svelte';
  import {messages} from '$lib/stores/messages';
  import {wallet, flow, chain} from '$lib/stores/wallet';
  import {onMount} from 'svelte';
  import {combine} from 'bleeps-common';
  import Melody from '$lib/components/Melody.svelte';

  const name = 'Bleeps and The Bleeps DAO';
</script>

<section class="py-8 px-4 text-center">
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
  </div>
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $wallet.state === 'Ready' && $chain.state === 'Ready'}
      <GreenNavButton
        class="w-24 mx-auto"
        label="Connect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => flow.connect()}
      >
        Mint
      </GreenNavButton>
      <!-- <NavButton
        label="Disconnect"
        disabled={$wallet.unlocking || $chain.connecting}
        on:click={() => wallet.disconnect()}
      >
        Disconnect
      </NavButton> -->
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

<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import Blockie from '$lib/components/Blockie.svelte';
  import {messages} from '$lib/stores/messages';
  import {wallet, flow, chain} from '$lib/stores/wallet';
  import {onMount} from 'svelte';
  import {combine} from 'bleeps-common';
  import Melody from '$lib/components/Melody.svelte';

  let message = '';
  async function setMessage() {
    await flow.execute((contracts) => contracts.MeloBleeps.mint(message));
  }

  onMount(() => {
    console.log('mount demo', {
      combine: combine(wallet.address || '0x0000000000000000000000000000000000000000', 'hi').toString(),
    });
  });
</script>

<section class="py-8 px-4 text-center">
  <h2 class="text-5xl mb-2 font-heading text-black dark:text-white">Melody creation coming soon!</h2>
  <p class="m-6 text-gray-500 dark:text-gray-400 text-xl">Bleeps DAO member get a share of each melody auction</p>
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $wallet.state === 'Ready' && $chain.state === 'Ready'}
      <Melody />
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

<style>
  ::-webkit-input-placeholder {
    /* Chrome/Opera/Safari */
    color: gray;
    opacity: 0.5;
  }
  ::-moz-placeholder {
    /* Firefox 19+ */
    color: gray;
    opacity: 0.5;
  }
  :-ms-input-placeholder {
    /* IE 10+ */
    color: gray;
    opacity: 0.5;
  }
  :-moz-placeholder {
    /* Firefox 18- */
    color: gray;
    opacity: 0.5;
  }
  @media (prefers-color-scheme: dark) {
    ::-webkit-input-placeholder {
      /* Chrome/Opera/Safari */
      color: pink;
      opacity: 0.5;
    }
    ::-moz-placeholder {
      /* Firefox 19+ */
      color: pink;
      opacity: 0.5;
    }
    :-ms-input-placeholder {
      /* IE 10+ */
      color: pink;
      opacity: 0.5;
    }
    :-moz-placeholder {
      /* Firefox 18- */
      color: pink;
      opacity: 0.5;
    }
  }
</style>

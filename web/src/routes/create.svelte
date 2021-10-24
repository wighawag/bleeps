<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {wallet, flow, chain} from '$lib/stores/wallet';
  import Melody from '$lib/components/Melody.svelte';
</script>

<section class="py-8 px-4 text-center">
  <h2 class="text-5xl mb-2 font-heading text-black dark:text-white">Melody creation (in progress!)</h2>
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

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

<WalletAccess>
  {#if $wallet.state === 'Ready' && $chain.state === 'Ready'}
    <Melody />
    <form class="mt-5 w-full max-w-sm">
      <div class="flex items-center">
        <NavButton
          label="Disconnect"
          disabled={$wallet.unlocking || $chain.connecting}
          on:click={() => wallet.disconnect()}
        >
          Disconnect
        </NavButton>
      </div>
    </form>
  {:else}
    <form class="mt-5 w-full max-w-sm">
      <div class="flex items-center">
        <NavButton label="Connect" disabled={$wallet.unlocking || $chain.connecting} on:click={() => flow.connect()}>
          Connect
        </NavButton>
      </div>
    </form>
  {/if}
</WalletAccess>

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

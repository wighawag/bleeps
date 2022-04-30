<script lang="ts">
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import NavButton from '$lib/components/styled/navigation/NavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/blockchain/wallet';
  import MelodyAndMint from '$lib/components/MelodyAndMint.svelte';
  import {onMount} from 'svelte';
  import {hashParams} from '$lib/config';
  import {currentMelody, decodeMelodyFromString, encodeMelodyToString, MelodyInfo} from '$lib/melodies/currentMelody';
  import {getHashParamsFromLocation} from '$lib/utils/web';

  onMount(() => {
    const melodyString = hashParams['melody'];
    if (melodyString) {
      if (melodyString.indexOf('~') > 0) {
        $currentMelody = decodeMelodyFromString(melodyString);
      } else {
        // old
        const melody = JSON.parse(atob(melodyString));
        $currentMelody = melody;
      }
      if ($currentMelody.speed === undefined) {
        $currentMelody.speed = 16;
      }
    }
  });

  let saving = false;
  function save(event: CustomEvent<MelodyInfo>) {
    const melody = event.detail;
    console.log(`saving...`);
    saving = true;
    if (typeof location !== 'undefined') {
      location.hash = `melody=${encodeMelodyToString(melody)}`;
    }
    console.log(`saved`);
  }

  function hashchange() {
    const hParams = getHashParamsFromLocation();
    console.log(hParams);
    const melodyString = hashParams['melody'];
    if (!saving) {
      if (melodyString) {
        console.log(`applying...`);
        if (melodyString.indexOf('~') > 0) {
          $currentMelody = decodeMelodyFromString(melodyString);
        } else {
          // old
          const melody = JSON.parse(atob(melodyString));
          $currentMelody = melody;
        }
        if ($currentMelody.speed === undefined) {
          $currentMelody.speed = 16;
        }
      }
    } else {
      console.log('applied');
      saving = false;
    }
  }

  // $: {
  //   if (typeof location !== 'undefined') {
  //     location.hash = `melody=${btoa(JSON.stringify($currentMelody))}`;
  //   }
  //   // `${$currentMelody.name}~${$currentMelody.slots.map(
  //   //   (v) => `${v.note + (v.instrument << 6)}~${v.volume}`
  //   // ).join('~')}`;
  // }
</script>

<svelte:window on:hashchange={hashchange} />

<section class="py-8 px-4 text-center">
  <h2 class="text-3xl mb-2 font-heading text-black dark:text-white">Melody creation (in progress!)</h2>
  <!-- <p class="m-6 text-gray-500 dark:text-gray-400 text-xl">Bleeps DAO member get a share of each melody auction</p> -->
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $chain.state === 'Ready' || $fallback.state === 'Ready'}
      <MelodyAndMint on:tosave={save} />
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

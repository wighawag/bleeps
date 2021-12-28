<script lang="ts">
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import NavButton from '$lib/components/styled/navigation/NavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/blockchain/wallet';
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

  function toPNG(metadataP: Promise<{image: string; animation_url: string; name: string}>): Promise<string> {
    return new Promise<string>(async (resolve) => {
      metadataP.then((metadata) => {
        const svgURL = metadata.image;
        // console.log({svgURL});
        const svgImage = document.createElement('img');
        svgImage.style.visibility = 'hidden';
        document.body.appendChild(svgImage);
        svgImage.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = 2048;
          canvas.height = 2048;
          const canvasCtx = canvas.getContext('2d');
          canvasCtx.drawImage(svgImage, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          // console.log({imgData});
          resolve(imgData);
        };
        svgImage.src = svgURL;
      });
    });
  }

  $: pngURL = sound && toPNG(sound);
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

          {#if pngURL}
            {#await pngURL then url}
              <a class="block underline" download={`bleep-${metadata.name}.png`} href={url}>download png</a>
            {/await}
          {/if}

          <a class="block underline" download={`bleep-${metadata.name}.wav`} href={metadata.animation_url}
            >download wav</a
          >
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

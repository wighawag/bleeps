<script lang="ts">
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {base} from '$app/paths';
  import {url} from '$lib/utils/url';

  const name = 'Bleeps and The Bleeps DAO';
</script>

<section class="px-4 text-center">
  <div class="mx-auto">
    <img
      class="mb-4 mx-auto"
      src={`${base}/images/logo.svg`}
      alt={name}
      style="width:256px;height:256px;"
      width="256px"
      height="256px"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-16">
      <div>
        <div>
          <img src={`${base}/bleeps/Bleep.png`} alt="Bleeps" class="w-24 mx-auto" />
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-black text-white">Mint <span class="text-bleeps">Bleeps</span></h3>
        </div>
      </div>
      <div>
        <div>
          <img src={`${base}/bleeps/Bleeper.png`} alt="Bleeper" class="w-24 mx-auto" />
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-black text-white">Become a <span class="text-bleeps">Bleeper</span></h3>
        </div>
      </div>
      <div>
        <div>
          <img src={`${base}/bleeps/Royalties.png`} alt="Royalties" class="w-24 mx-auto" />
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-black text-white">Earn <span class="text-bleeps">Royalties</span></h3>
        </div>
      </div>
      <div>
        <div>
          <img src={`${base}/bleeps/DAO.png`} alt="BleepsDAO" class="w-24 mx-auto" />
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-black text-white">Join The <span class="text-bleeps">Bleeps DAO</span></h3>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="w-full mx-auto text-center">
  <NavButton class="w-64 mx-auto" label="Mint" href={url('mint/')}>Bleeps Auction Sale</NavButton>
  <a class="block m-8 underline text-bleeps" href={url('about/')}>Learn More</a>
</div>

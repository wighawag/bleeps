<script lang="ts">
  import '../service-worker-handler';
  import '../global.css';
  import {url} from '$lib/utils/url';
  import NavBar from '$lib/components/navigation/NavBar.svelte';
  import Notifications from '$lib/components/notification/Notifications.svelte';
  import NoInstallPrompt from '$lib/components/NoInstallPrompt.svelte';
  import NewVersionNotification from '$lib/components/NewVersionNotification.svelte';

  import {appDescription, url as appUrl} from '../../application.json';

  import {base} from '$app/paths';
  import contractsInfo from '$lib/contracts.json';
  import {flow, wallet} from '$lib/stores/wallet';

  const title = 'Bleeps And The Bleeps DAO';
  const description = appDescription;
  const host = appUrl.endsWith('/') ? appUrl : appUrl + '/';
  const previewImage = host + 'preview.png';

  function disconnect() {
    wallet.disconnect();
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={host} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={previewImage} />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={host} />
  <meta property="twitter:title" content={title} />
  <meta property="twitter:description" content={description} />
  <meta property="twitter:image" content={previewImage} />
</svelte:head>

<NoInstallPrompt />
<NewVersionNotification />

<NavBar
  links={[
    {href: url(''), title: 'Bleeps'},
    {href: url('mint/'), title: 'Mint'},
    {href: url('create/'), title: 'Create'},
    {href: url('about/'), title: 'About'},
    // {href: url('test/'), title: 'Test'},
  ]}
>
  {#if $wallet && $wallet.state === 'Ready' && $wallet.address}
    <span class="text-bleeps"
      >{$wallet.address.startsWith('0x') ? $wallet.address.slice(0, 6) + '...' : $wallet.address}<svg
        on:click={disconnect}
        xmlns="http://www.w3.org/2000/svg"
        class="ml-4 h-6 w-6 inline align-middle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg></span
    >
  {:else}
    <button class="text-bleeps inline border border-bleeps p-1 -m-1" on:click={() => flow.connect()}>connect</button>
  {/if}
</NavBar>

<div class="pl-2 mt-4 flex space-x-6 md:order-2 absolute left-0">
  <a href="https://twitter.com/bleepsDAO" target="_blank" class="text-bleeps hover:text-yellow-500">
    <span class="sr-only">Twitter</span>
    <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"
      />
    </svg>
  </a>

  {#if contractsInfo.contracts.Bleeps?.address}
    <a href="https://github.com/wighawag/bleeps" target="_blank" class="text-bleeps hover:text-yellow-500">
      <span class="sr-only">GitHub</span>
      <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clip-rule="evenodd"
        />
      </svg>
    </a>
  {/if}

  <a href="https://discord.com/invite/DRtq7xBdtn" target="_blank" class="text-bleeps hover:text-yellow-500">
    <span class="sr-only">Discord</span>
    <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 245 240" fill="currentColor"
      ><path
        class="st0"
        d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zM140.9 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"
      /><path
        class="st0"
        d="M189.5 20h-134C44.2 20 35 29.2 35 40.6v135.2c0 11.4 9.2 20.6 20.5 20.6h113.4l-5.3-18.5 12.8 11.9 12.1 11.2 21.5 19V40.6c0-11.4-9.2-20.6-20.5-20.6zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2z"
      /></svg
    >
  </a>

  <a href="https://knowledge.bleeps.art/" target="_blank" class="text-bleeps hover:text-yellow-500">
    <span class="sr-only">Discord</span>
    <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
      ><g transform="translate(0.000000, 71.000000)">
        <path
          d="M230.457896,308.135394 C238.456251,308.135394 245.654771,314.534078 245.654771,323.332269 C245.654771,331.330624 239.256087,338.529144 230.457896,338.529144 C222.459541,338.529144 215.261021,332.13046 215.261021,323.332269 C215.261021,314.534078 222.459541,308.135394 230.457896,308.135394 M465.60954,215.354474 C457.611184,215.354474 450.412665,208.955789 450.412665,200.157599 C450.412665,192.159243 456.811349,184.960724 465.60954,184.960724 C473.607895,184.960724 480.806415,191.359408 480.806415,200.157599 C480.806415,208.155954 473.607895,215.354474 465.60954,215.354474 M465.60954,153.767138 C440.014803,153.767138 419.219079,174.562862 419.219079,200.157599 C419.219079,204.956612 420.018915,209.755625 421.618586,214.554638 L268.850001,296.137861 C260.05181,283.340493 245.654771,276.141973 230.457896,276.141973 C212.861515,276.141973 196.864804,286.539835 188.866449,301.73671 L51.2947389,229.751513 C36.8976995,221.753158 25.7000022,198.557928 27.2996732,176.162533 C28.0995088,164.964836 32.0986864,156.166645 37.697535,152.967303 C41.6967127,150.567796 45.6958903,151.367632 51.2947389,153.767138 L52.0945744,154.566974 C88.8870085,173.763026 208.062501,236.150197 212.861515,238.549704 C220.85987,241.749046 224.859047,243.348717 238.456251,236.950033 L484.805592,108.976349 C488.80477,107.376678 492.803947,104.177336 492.803947,98.5784873 C492.803947,91.3799676 485.605428,88.1806255 485.605428,88.1806255 C471.208388,81.7819414 449.612829,71.3840796 428.817106,61.7860533 C384.026316,40.9903297 332.836843,16.995264 310.441448,4.99773118 C291.245396,-5.40013062 275.248685,3.39806013 272.849179,4.99773118 L267.25033,7.39723775 C165.671219,58.5867112 31.2988509,124.97306 23.3004956,129.772073 C9.70329174,137.770428 0.905100995,154.566974 0.105265472,175.362698 C-1.49440557,208.155954 15.3021404,242.548881 39.2972061,254.546414 L184.867271,329.730953 C188.066613,352.126348 208.062501,369.72273 230.457896,369.72273 C256.052633,369.72273 276.048521,349.726841 276.848356,324.132105 L436.815461,237.749868 C444.813816,244.148552 455.211678,247.347895 465.60954,247.347895 C491.204276,247.347895 512,226.552171 512,200.957434 C512,174.562862 491.204276,153.767138 465.60954,153.767138"
          fill-rule="nonzero"
        />
      </g></svg
    >
  </a>
</div>

<div class="text-white">
  <slot />
</div>
<Notifications />

<footer class="bg-black" aria-labelledby="footerHeading">
  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 text-center">
    <div class="mt-8 border-t border-gray-700 pt-8 text-gray-400">
      {#if contractsInfo.contracts.Bleeps?.address}
        <p class="mt-4 p-1">
          The source code can be found
          <a href="https://github.com/wighawag/bleeps" target="_blank" class="underline">here</a>
          and the contract address is
          <a
            href={`https://etherscan.io/address/${contractsInfo.contracts.Bleeps?.address}`}
            target="_blank"
            class="underline text-xs sm:text-base">{contractsInfo.contracts.Bleeps?.address}</a
          >
        </p>
      {/if}

      <p class="p-1">
        This project was created by
        <a href="https://ronan.eth.link" target="_blank" class="underline">Ronan Sandford</a>
        (a.k.a
        <a href="https://twitter.com/wighawag" target="_blank" class="underline"
          >wighawag
          <img class="w-4 h-4 inline" alt="wighawag" src={`${base}/images/wig256x256.jpg`} /></a
        >)
      </p>

      <p class="p-1">
        Web Design by <a class="underline" target="_blank" href="https://vanhullebus.ch/">Buche</a> (<a
          class="underline"
          target="_blank"
          href="https://twitter.com/BucheMakesGames">@BucheMakesGames</a
        >)
      </p>

      <div class="mt-4 flex space-x-6 md:order-2 float-right">
        <a href="https://twitter.com/bleepsDAO" target="_blank" class="text-gray-400 hover:text-gray-300">
          <span class="sr-only">Twitter</span>
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"
            />
          </svg>
        </a>

        {#if contractsInfo.contracts.Bleeps?.address}
          <a href="https://github.com/wighawag/bleeps" target="_blank" class="text-gray-400 hover:text-gray-300">
            <span class="sr-only">GitHub</span>
            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clip-rule="evenodd"
              />
            </svg>
          </a>
        {/if}

        <a href="https://discord.com/invite/DRtq7xBdtn" target="_blank" class="text-gray-400 hover:text-gray-300">
          <span class="sr-only">Discord</span>
          <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 245 240" fill="currentColor"
            ><path
              class="st0"
              d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zM140.9 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"
            /><path
              class="st0"
              d="M189.5 20h-134C44.2 20 35 29.2 35 40.6v135.2c0 11.4 9.2 20.6 20.5 20.6h113.4l-5.3-18.5 12.8 11.9 12.1 11.2 21.5 19V40.6c0-11.4-9.2-20.6-20.5-20.6zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2z"
            /></svg
          >
        </a>

        <a href="https://knowledge.bleeps.art/" target="_blank" class="text-gray-400 hover:text-gray-300">
          <span class="sr-only">Discord</span>
          <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"
            ><g transform="translate(0.000000, 71.000000)">
              <path
                d="M230.457896,308.135394 C238.456251,308.135394 245.654771,314.534078 245.654771,323.332269 C245.654771,331.330624 239.256087,338.529144 230.457896,338.529144 C222.459541,338.529144 215.261021,332.13046 215.261021,323.332269 C215.261021,314.534078 222.459541,308.135394 230.457896,308.135394 M465.60954,215.354474 C457.611184,215.354474 450.412665,208.955789 450.412665,200.157599 C450.412665,192.159243 456.811349,184.960724 465.60954,184.960724 C473.607895,184.960724 480.806415,191.359408 480.806415,200.157599 C480.806415,208.155954 473.607895,215.354474 465.60954,215.354474 M465.60954,153.767138 C440.014803,153.767138 419.219079,174.562862 419.219079,200.157599 C419.219079,204.956612 420.018915,209.755625 421.618586,214.554638 L268.850001,296.137861 C260.05181,283.340493 245.654771,276.141973 230.457896,276.141973 C212.861515,276.141973 196.864804,286.539835 188.866449,301.73671 L51.2947389,229.751513 C36.8976995,221.753158 25.7000022,198.557928 27.2996732,176.162533 C28.0995088,164.964836 32.0986864,156.166645 37.697535,152.967303 C41.6967127,150.567796 45.6958903,151.367632 51.2947389,153.767138 L52.0945744,154.566974 C88.8870085,173.763026 208.062501,236.150197 212.861515,238.549704 C220.85987,241.749046 224.859047,243.348717 238.456251,236.950033 L484.805592,108.976349 C488.80477,107.376678 492.803947,104.177336 492.803947,98.5784873 C492.803947,91.3799676 485.605428,88.1806255 485.605428,88.1806255 C471.208388,81.7819414 449.612829,71.3840796 428.817106,61.7860533 C384.026316,40.9903297 332.836843,16.995264 310.441448,4.99773118 C291.245396,-5.40013062 275.248685,3.39806013 272.849179,4.99773118 L267.25033,7.39723775 C165.671219,58.5867112 31.2988509,124.97306 23.3004956,129.772073 C9.70329174,137.770428 0.905100995,154.566974 0.105265472,175.362698 C-1.49440557,208.155954 15.3021404,242.548881 39.2972061,254.546414 L184.867271,329.730953 C188.066613,352.126348 208.062501,369.72273 230.457896,369.72273 C256.052633,369.72273 276.048521,349.726841 276.848356,324.132105 L436.815461,237.749868 C444.813816,244.148552 455.211678,247.347895 465.60954,247.347895 C491.204276,247.347895 512,226.552171 512,200.957434 C512,174.562862 491.204276,153.767138 465.60954,153.767138"
                fill-rule="nonzero"
              />
            </g></svg
          >
        </a>
      </div>
    </div>
  </div>
</footer>

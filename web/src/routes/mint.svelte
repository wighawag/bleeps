<script lang="ts">
  import WalletAccess from '$lib/WalletAccess.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import GreenNavButton from '$lib/components/navigation/GreenNavButton.svelte';
  import {wallet, flow, chain, fallback} from '$lib/stores/wallet';
  import Modal from '$lib/components/Modal.svelte';
  import {ownersState} from '$lib/stores/owners';
  import type {OwnersState} from '$lib/stores/owners';
  import {base} from '$app/paths';
  import BleepsSvg from '$lib/components/BleepsSVG.svelte';
  import {instrumentName, instrumentNameFromId, noteName} from '$lib/utils/notes';
  import {contracts} from '$lib/contracts.json';
  import {calculateHash} from 'bleeps-common';
  import {joinSignature} from '@ethersproject/bytes';
  import {keccak256 as solidityKeccak256} from '@ethersproject/solidity';
  import {BigNumber} from '@ethersproject/bignumber';
  import {now, time} from '$lib/stores/time';
  import {bookingService} from '$lib/services/bookingService';
  import type {TransactionRequest, TransactionResponse} from '@ethersproject/abstract-provider';
  import {rebuildLocationHash} from '$lib/utils/web';
  import MandalaIcon from '$lib/components/icons/MandalaIcon.svelte';
  import DiscordIcon from '$lib/components/icons/DiscordIcon.svelte';
  import PassKeyIcon from '$lib/components/icons/PassKeyIcon.svelte';
  import {onMount} from 'svelte';
  import {displayAddress, time2text} from '$lib/utils';
  import {chainName} from '$lib/config';

  // import {hashParams} from '$lib/config';
  // import {onMount} from 'svelte';

  const name = 'Bleeps and The Bleeps DAO';

  const soldout = chainName === 'mainnet'; // so we do not need to fetch dynamically

  let step: 'FETCHING_LAST_PRICE' | 'TX_CREATION' | 'TX_SBUMITTED' | 'IDLE' = 'IDLE';
  let error: string | undefined;

  let selected: number | undefined = undefined;

  let currentTime;
  onMount(() => {
    currentTime = now();
    return time.subscribe((t) => {
      currentTime = t;
    });
  });

  async function book(booking: {
    address: string;
    bleep: number;
    pass?: {id: number; to: string; signature: string};
  }): Promise<NodeJS.Timeout> {
    try {
      await bookingService.book({
        address: booking.address,
        bleep: booking.bleep,
        pass: booking.pass,
      });
    } catch (e) {
      error = formatError(e);
      step = 'IDLE';
      throw e;
    }
    return setInterval(() => {
      bookingService.book({
        address: booking.address,
        bleep: booking.bleep,
        pass: booking.pass,
      });
    }, 2000);
  }

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

  async function mint(bleepId: number) {
    flow.execute(async (contracts) => {
      step = 'FETCHING_LAST_PRICE';
      await ownersState.waitFirstPriceInfo;
      step = 'TX_CREATION';

      let bookingInterval: NodeJS.Timeout | undefined = undefined;
      let tx: TransactionResponse | undefined;
      let bookingSig = '';
      const passId = $ownersState.passId;
      if ($ownersState.timeLeftBeforePublic < 0) {
        try {
          bookingInterval = await book({
            address: wallet.address,
            bleep: bleepId,
          });
        } catch (e) {
          error = formatError(e);
          step = 'IDLE';
          return;
        }

        try {
          tx = await contracts.BleepsInitialSale.mint(bleepId, wallet.address, {
            value: $ownersState.expectedValue,
            metadata: {
              type: 'mint',
              id: bleepId,
            },
          });
          // step = 'TX_SBUMITTED';
          // await tx.wait();
          step = 'IDLE';
        } catch (e) {
          if (e?.message && e?.message.indexOf('User denied') === -1) {
            error = formatError(e);
          }
          step = 'IDLE';
          clearInterval(bookingInterval);
          return;
        }
      } else if (!$ownersState.passKeySigner) {
        if (passId === undefined) {
          throw new Error(`no pass wallet or pass key`);
        }

        const proof = $ownersState.merkleTree.getProof(calculateHash('' + passId, wallet.address));

        try {
          bookingInterval = await book({
            address: wallet.address,
            bleep: bleepId,
            pass: {
              id: passId,
              signature: '', // TODO will require(mandala signature proof)
              to: wallet.address,
            },
          });
        } catch (e) {
          error = formatError(e);
          step = 'IDLE';
          return;
        }

        try {
          tx = await contracts.BleepsInitialSale.mintWithPassId(bleepId, wallet.address, passId, proof, {
            value: $ownersState.expectedValue,
            metadata: {
              type: 'mint',
              id: bleepId,
              passId: passId,
            },
          });
          // step = 'TX_SBUMITTED';
          // await tx.wait();
          step = 'IDLE';
        } catch (e) {
          if (e?.message && e?.message.indexOf('User denied') === -1) {
            error = formatError(e);
          }
          step = 'IDLE';
          clearInterval(bookingInterval);
          return;
        }
      } else {
        bookingSig = await $ownersState.passKeyWallet.signMessage(`${bleepId}`);
        const signature = $ownersState.passKeySigner.signDigest(
          solidityKeccak256(['uint256', 'address'], [passId, wallet.address])
        );
        const proof = $ownersState.merkleTree.getProof(calculateHash('' + passId, $ownersState.passKeyWallet.address));

        try {
          bookingInterval = await book({
            address: wallet.address,
            bleep: bleepId,
            pass: {
              id: passId,
              signature: bookingSig,
              to: wallet.address,
            },
          });
        } catch (e) {
          error = formatError(e);
          step = 'IDLE';
          return;
        }

        try {
          tx = await contracts.BleepsInitialSale.mintWithSalePass(
            bleepId,
            wallet.address,
            passId,
            joinSignature(signature),
            proof,
            {
              value: $ownersState.expectedValue,
              metadata: {
                type: 'mint',
                id: bleepId,
                passId: passId,
              },
            }
          );
          // step = 'TX_SBUMITTED';
          // await tx.wait();
          step = 'IDLE';
        } catch (e) {
          if (e?.message && e?.message.indexOf('User denied') === -1) {
            error = formatError(e);
          }
          step = 'IDLE';
          clearInterval(bookingInterval);
          return;
        }
      }
      clearInterval(bookingInterval);
      if (tx) {
        await bookingService.book({
          address: wallet.address,
          bleep: bleepId,
          pass:
            passId !== undefined
              ? {
                  id: passId,
                  signature: bookingSig,
                  to: '',
                }
              : undefined,
          transactionHash: tx.hash,
        });
      }
      if (passId !== undefined) {
        rebuildLocationHash({});
        ownersState.reCheckPassIdAfterUse();
      }
    });
  }

  function isMintable(state: OwnersState, id: number): boolean {
    const instr = id >> 6;
    return (
      !(instr === 7 || instr === 8) &&
      state.priceInfo?.uptoInstr?.gte(instr) &&
      state.timeLeftBeforeSale <= 0 &&
      (state.timeLeftBeforePublic <= 0 || state.passId !== undefined) &&
      !state.invalidPassId &&
      // !state.priceInfo?.passUsed && // TODO
      state.tokenOwners &&
      state.tokenOwners[id].address === '0x0000000000000000000000000000000000000000' &&
      !state.tokenOwners[id].booked
    );
  }

  function isInstrumentMintable(state: OwnersState, instr: number): boolean {
    return (
      !(instr === 7 || instr === 8) &&
      state.priceInfo?.uptoInstr?.gte(instr) &&
      // (state.timeLeftBeforePublic <= 0 || state.passId !== undefined) &&
      // !state.invalidPassId &&
      // !state.priceInfo?.passUsed &&
      state.numLeftPerInstr[instr] > 0
    );
  }

  function mintButton(state: OwnersState, id: number): string {
    if (
      state.priceInfo?.uptoInstr?.gte(id >> 6) &&
      state.timeLeftBeforeSale <= 0 &&
      (state.timeLeftBeforePublic <= 0 || state.passId !== undefined) &&
      !state.invalidPassId &&
      // !state.priceInfo?.passUsed && TODO
      state.tokenOwners &&
      state.tokenOwners[id].address === '0x0000000000000000000000000000000000000000' &&
      !state.tokenOwners[id].booked
    ) {
      return (
        'mint for ' +
        BigNumber.from(contracts.BleepsInitialSale.linkedData.price).div('1000000000000000').toNumber() / 1000 +
        ' ETH'
      );
    } else {
      if (state.timeLeftBeforeSale > 0) {
        return 'sale not started';
      } else if (state.timeLeftBeforePublic > 0 && state.passId === undefined) {
        return 'need pass';
      } else if (state.tokenOwners && state.tokenOwners[id].address !== '0x0000000000000000000000000000000000000000') {
        return 'already minted';
      } else if (state.tokenOwners && state.tokenOwners[id].booked) {
        return 'booked';
      } else if (state.invalidPassId) {
        return 'invalid pass';
      } else if (state.priceInfo?.passUsed) {
        return 'pass used';
      } else {
        return 'not available';
      }
    }
  }
</script>

{#if $ownersState.invalidPassId}
  <div class="absolute right-0 text-white-600 mb-2 text-center border border-red-400 p-2 mr-2 rounded-md  inline-block">
    <p>Invalid Pass Key</p>
  </div>
{:else if $ownersState?.passId !== undefined}
  {#if !$ownersState?.priceInfo?.passUsed}
    {#if $ownersState?.passKeySigner}
      {#if $wallet.address && $wallet.state === 'Ready' && $ownersState?.mandalaPassId && !$ownersState?.mandalaPassIdUsed}
        <div class="absolute right-0 ">
          <PassKeyIcon class="w-6 h-6 text-bleeps inline align-baseline mr-2" />
          <div class="text-white-600 mb-2 text-center border border-bleeps p-2 mr-2 rounded-md inline-block">
            <p>1 Available Mint</p>
            <p class="text-bleeps text-xs">passkey</p>
          </div>
          <br />
          <MandalaIcon class="w-6 h-6 text-bleeps inline align-baseline mr-2" />
          <div class="text-white-600 mb-2 text-center border border-bleeps p-2 mr-2 rounded-md  inline-block">
            <p>1 Available Mint</p>
            <p class="text-bleeps text-xs">mandala</p>
          </div>
        </div>
      {:else}
        <div class="absolute right-0 ">
          <PassKeyIcon class="w-6 h-6 text-bleeps inline align-baseline mr-2" />
          <div class="text-white-600 mb-2 text-center border border-bleeps p-2 mr-2 rounded-md  inline-block">
            <p>1 Available Mint</p>
            <p class="text-bleeps text-xs">passkey</p>
          </div>
        </div>
      {/if}
    {:else if $wallet.address && $wallet.state === 'Ready'}
      <div class="absolute right-0 ">
        <MandalaIcon class="w-6 h-6 text-bleeps inline align-baseline mr-2" />
        <div class="text-white-600 mb-2 text-center border border-bleeps p-2 mr-2 rounded-md  inline-block">
          <p>1 Available Mint</p>
          <p class="text-bleeps text-xs">mandala</p>
        </div>
      </div>
    {/if}
  {:else}
    <div
      class="absolute right-0 text-white-600 mb-2 text-center border border-red-400 p-2 mr-2 rounded-md  inline-block"
    >
      <p>Pass used</p>
    </div>
  {/if}
{/if}

<!-- {$ownersState.state} TODO show loading  -->
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

    {#if soldout || ($ownersState?.numLeft !== undefined && $ownersState?.numLeft === 0)}
      <div class="border-4 border-white w-80 sm:w-96 h-12 pt-2 mx-auto">
        <span class="text-bleeps">Sold Out</span>
      </div>
    {:else if currentTime}
      {#if currentTime < contracts.BleepsInitialSale.linkedData.startTime}
        <div class="border-4 border-white w-80 sm:w-96 h-24 pt-1 mx-auto">
          <span class="text-bleeps"
            >Private Sale for <MandalaIcon class="h-4 w-4 text-bleeps inline" /> and <DiscordIcon
              class="h-4 w-4 text-bleeps inline"
            /></span
          >
          <div class="mx-auto mt-1">Opens in:</div>
          <span>{time2text(contracts.BleepsInitialSale.linkedData.startTime - currentTime)}</span>
        </div>
      {:else if currentTime < contracts.BleepsInitialSale.linkedData.publicSaleTimestamp}
        <div class="border-4 border-white w-80 sm:w-96 h-24 pt-1 mx-auto">
          <span>Ongoing </span>
          <span class="text-bleeps"
            >Private Sale for <MandalaIcon class="h-4 w-4 text-bleeps inline" /> and <DiscordIcon
              class="h-4 w-4 text-bleeps inline"
            /></span
          >
          <div class="mt-1 mx-auto">Time Left:</div>
          <span>{time2text(contracts.BleepsInitialSale.linkedData.publicSaleTimestamp - currentTime)}</span>
        </div>
      {:else}
        <div class="border-4 border-white w-80 sm:w-96 h-12 pt-2 mx-auto">
          <span>Ongoing </span> <span class="text-bleeps">Public Sale</span>
        </div>
      {/if}
    {/if}

    {#if ($chain.state === 'Ready' || $fallback.state === 'Ready') && !$ownersState?.expectedValue}
      <p class="text-blue-600 text-xl m-4">Loading...</p>
    {/if}

    {#if $ownersState?.expectedValue}
      {#if $ownersState?.daoTreasury !== undefined}
        <p class="text-bleeps mt-8 font-black">
          Bleeps DAO Treasury: {$ownersState?.daoTreasury.div('1000000000000000').toNumber() / 1000} ETH
        </p>
      {/if}

      <div class="mt-2">
        <div class="inline-block border-bleeps md:w-64 w-32 md:h-24 h-16 border-2 mx-auto rounded-md">
          {#if $ownersState?.numLeftPerInstr !== undefined}
            <div
              style={`width:${Math.max(
                ((448 - $ownersState?.numLeft) * 100) / 448,
                5
              )}%; background-color:#dab894;height:100%;position:relative;line-height:inherit;`}
            />
          {:else}
            <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
          {/if}
        </div>
        <div class="inline-block border-bleeps border md:w-24 w-12 md:h-24 h-16 border-2 mx-auto rounded-md">
          <p class="absolute my-8 mx-3 invisible md:visible">reserved</p>
          <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
        </div>
      </div>

      <div>
        <div class="inline-block md:w-64 w-32 mx-auto">
          {#if $ownersState?.numLeft !== undefined}
            <p class="text-yellow-400">{448 - $ownersState?.numLeft} / 448 Minted</p>
          {/if}
        </div>
        <div class="inline-block md:w-24 w-12 mx-auto">
          <p>+128</p>
        </div>
        <!-- <div class="inline-block md:w-64 w-32 mx-auto">
        <p>(+448)</p>
      </div> -->
      </div>

      <div class="mb-8">
        <div class="inline-block md:w-64 w-32 mx-auto">
          <p class="text-bleeps">
            {#if $ownersState?.expectedValue}
              Price: {$ownersState?.expectedValue.div('1000000000000000').toNumber() / 1000} ETH
            {/if}
          </p>
        </div>
        <div class="inline-block md:w-24 w-12 mx-auto" />
        <!-- <div class="inline-block md:w-64 w-32 mx-auto" /> -->
      </div>
    {/if}
  </div>
</section>

<div class="w-full mx-auto text-center">
  <WalletAccess>
    {#if $chain.state === 'Ready' || $fallback.state === 'Ready'}
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
            <div
              id={`instr_${instr}`}
              class={`${isInstrumentMintable($ownersState, instr) ? 'text-white' : 'text-gray-500'}`}
            >
              <!-- <h2 class="mx-auto">{instrumentName(instr)}</h2> -->

              <div
                class={`${
                  isInstrumentMintable($ownersState, instr) ? 'border-bleeps' : 'border-gray-500'
                } w-32 h-16 border-2 mx-auto rounded-md`}
              >
                {#if !(instr === 7 || instr === 8)}
                  {#if $ownersState?.priceInfo?.uptoInstr.lt(instr)}
                    <p class="z-30 absolute my-5 mx-3 w-24 h-24">sale later</p>
                  {:else}
                    <p class="z-30 absolute my-5 mx-3 w-24 h-24">
                      {instrumentName(instr)}
                    </p>
                  {/if}
                {:else}
                  <p class="z-30 absolute my-5 mx-3 w-24 h-24">reserved</p>
                {/if}
                {#if $ownersState?.numLeftPerInstr !== undefined}
                  <div
                    style={`width:${
                      $ownersState?.numLeftPerInstr[instr] !== 64
                        ? Math.max(((64 - $ownersState?.numLeftPerInstr[instr]) * 100) / 64, 5)
                        : 0
                    }%; background-color:#dab894;height:100%;position:relative;line-height:inherit;`}
                  />
                {:else}
                  <div style="width:0%; background-color:#dab894;height:100%;position:relative;line-height:inherit;" />
                {/if}
              </div>

              {#if $ownersState?.numLeftPerInstr !== undefined}
                <p>{64 - $ownersState.numLeftPerInstr[instr]} / 64 Minted</p>
              {/if}

              <div class="grid grid-cols-8 mx-auto p-1 mb-16 gap-1 sm:gap-2 md:gap-4">
                {#each Array.from(Array(64)).map((v, i) => i + instr * 64) as bleepId}
                  <div>
                    <BleepsSvg
                      booked={instr === 7 ||
                        instr === 8 ||
                        ($ownersState.tokenOwners &&
                          $ownersState.tokenOwners[bleepId] &&
                          $ownersState.tokenOwners[bleepId].booked &&
                          !$ownersState.tokenOwners[bleepId].pending)}
                      owner={$ownersState.tokenOwners ? $ownersState.tokenOwners[bleepId]?.address : undefined}
                      id={bleepId}
                      pending={$ownersState.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId].pending}
                      your={$ownersState.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId].address.toLowerCase() === $wallet.address?.toLowerCase()}
                      disabled={!isMintable($ownersState, bleepId)}
                      minted={instr !== 7 &&
                        instr !== 8 &&
                        $ownersState?.tokenOwners &&
                        $ownersState.tokenOwners[bleepId] &&
                        $ownersState.tokenOwners[bleepId].address !== '0x0000000000000000000000000000000000000000'}
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
      {#if isInstrumentMintable($ownersState, selected >> 6)}
        {#if $ownersState.tokenOwners && $ownersState.tokenOwners[selected].address !== '0x0000000000000000000000000000000000000000'}
          <div class="border-2 border-bleeps p-2 rounded-md">
            Owned by {displayAddress($ownersState.tokenOwners[selected].address, 20)}
          </div>
        {:else}
          <div>
            <p>
              <span class="text-bleeps">Bleeps DAO</span> will receive {BigNumber.from(
                contracts.BleepsInitialSale.linkedData.price
              )
                .mul(10000 - contracts.BleepsInitialSale.linkedData.percentageForCreator)
                .div(10000)
                .div('1000000000000000')
                .toNumber() / 1000} ETH
            </p>
            <p class="mb-2">
              <a href="https://twitter.com/wighawag" target="_blank" class="text-bleeps underline">wighawag</a> will
              receive
              {BigNumber.from(contracts.BleepsInitialSale.linkedData.price)
                .mul(contracts.BleepsInitialSale.linkedData.percentageForCreator)
                .div(10000)
                .div('1000000000000000')
                .toNumber() / 1000} ETH
            </p>
          </div>
          <!-- active={isMintable($ownersState, selected)} -->
          <button
            label="mint"
            class={`block ${
              isMintable($ownersState, selected) ? 'bg-bleeps hover:bg-yellow-600' : 'bg-gray-600 cursor-default'
            }  text-white font-bold py-2 px-4 rounded w-64 mx-auto`}
            disabled={!isMintable($ownersState, selected)}
            on:click={() => {
              if (
                $ownersState.priceInfo?.uptoInstr?.gte(selected >> 6) &&
                !$ownersState.invalidPassId &&
                // !$ownersState.priceInfo?.passUsed && // TODO
                $ownersState.tokenOwners &&
                $ownersState.tokenOwners[selected].address === '0x0000000000000000000000000000000000000000' &&
                !$ownersState.tokenOwners[selected].booked
              ) {
                mint(selected);
                selected = undefined;
              }
            }}>{mintButton($ownersState, selected)}</button
          >
        {/if}
      {/if}
    </div>
  </Modal>
{/if}
{#if error}
  <Modal on:close={() => (error = undefined)}>{error}</Modal>
{:else if step !== 'IDLE'}
  <Modal cancelable={false}>
    <div class="text-white">
      {#if step === 'TX_CREATION'}
        Transaction To Be Authorized...
      {:else if step === 'FETCHING_LAST_PRICE'}
        Fetching Latest Price....
      {:else}
        Waiting for transaction...
      {/if}
    </div>
  </Modal>
{/if}

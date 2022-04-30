<script lang="ts">
  import {onMount} from 'svelte';
  import {hashParams} from '$lib/config';
  import BleepPage from '$lib/components/BleepPage.svelte';
  import BleepListPage from '$lib/components/BleepListPage.svelte';
  let selected: number;

  onMount(() => {
    const idAsNumber = parseInt(hashParams['id']);
    if (!isNaN(idAsNumber)) {
      selected = idAsNumber;
    }
  });
</script>

{#if selected}
  <BleepPage {selected} />
{:else}
  <BleepListPage />
{/if}

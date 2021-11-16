<script lang="ts">
  import BleepsSvg from '$lib/components/BleepsSVG.svelte';

  let ids = Array.from(Array(16)).map((v, index) => (index << 6) + 32);
</script>

<!-- <div style="display: grid;grid-template-columns: auto auto auto auto; gap: 1em; padding: 1em;"> -->
<div class="grid grid-cols-4 xl:grid-cols-8 gap-4 p-4">
  {#each ids as bleepId}
    <BleepsSvg id={bleepId} minted={true} disabled={false} pending={false} your={false} />
  {/each}
</div>

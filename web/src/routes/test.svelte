<script lang="ts">
  import BleepsSvg from '$lib/components/BleepsSVG.svelte';

  let ids = Array.from(Array(16)).map((v, index) => (index << 6) + 32);
</script>

<div style="display: grid;grid-template-columns: auto auto auto auto;">
  {#each ids as bleepId}
    <BleepsSvg id={bleepId} minted={true} disabled={false} pending={false} your={false} />
  {/each}
</div>

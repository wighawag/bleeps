<script lang="ts">
  import {onMount} from 'svelte';

  onMount(() => {
    window.location.replace(location.href.replace('/mint', '/bleeps'));
  });
</script>

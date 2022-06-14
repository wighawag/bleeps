<script>
  import {getContext} from 'svelte';
  import {TABS} from './Tabs.svelte';

  const tab = {};
  const {registerTab, selectTab, selectedTab} = getContext(TABS);

  registerTab(tab);
</script>

<button
  class={`${$selectedTab === tab ? 'border-white text-white' : 'border-bleeps text-bleeps'}  border-b mb-1`}
  on:click={() => selectTab(tab)}
>
  <slot />
</button>

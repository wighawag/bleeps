<script lang="ts">
  type LinkInfo = {href: string; title: string};
  export let links: LinkInfo[];
  import NavLink from './NavLink.svelte';
  import Loading from '../Loading.svelte';
  import {urlOfPath} from '$lib/utils/url';
  import {page, navigating} from '$app/stores';

  // TODO better handling of pages not part of the list of nav links
  let noLink = true;
  $: for (const link of links) {
    if (urlOfPath(link.href, $page.path)) {
      noLink = false;
    }
  }
</script>

<div class="flex m-1 border-b border-bleeps">
  <ul class={`flex ${noLink ? 'border-b border-bleeps' : ''}`}>
    {#each links as link}
      <NavLink href={link.href} active={urlOfPath(link.href, $page.path)}>
        {link.title}
        <!-- ({link.href}) -->
      </NavLink>
    {/each}
  </ul>
  <div class="top-3 right-3 absolute">
    <slot />
  </div>
</div>

{#if $navigating}
  <Loading />
{/if}

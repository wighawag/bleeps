<script lang="ts">
  export let active = false;
  export let href: string;
</script>

{#if active}
  <li class="-mb-px mr-1">
    <span
      class="bg-white dark:bg-black inline-block border-l border-t border-r rounded-t py-2 px-1 sm:px-4 text-sm sm:text-base border-bleeps text-bleeps font-semibold"
      {href}
    >
      <slot />
    </span>
  </li>
{:else}
  <li class="-mb-px mr-1">
    <a
      class="bg-white dark:bg-black inline-block py-2 px-1 sm:px-4 text-sm sm:text-base border-bleeps text-bleeps font-semibold"
      {href}
    >
      <slot />
    </a>
  </li>
{/if}

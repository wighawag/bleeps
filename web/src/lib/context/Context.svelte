<script lang="ts">
	import {setAppContext} from '$lib';
	import type {Context} from './types';
	import {onMount, type Snippet} from 'svelte';

	interface Props {
		context: {context: Context; start: () => () => void};
		children?: Snippet;
	}

	let {context, children}: Props = $props();
	setAppContext(() => context.context);

	onMount(() => {
		return context.start();
	});
</script>

{@render children?.()}

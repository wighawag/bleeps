<script lang="ts">
	import type {Context} from './types';
	import type {Snippet} from 'svelte';
	import ContextComponent from './Context.svelte';
	import {browser} from '$app/environment';
	import {url} from '$lib/core/utils/web/path';
	import {createSplashLoader} from './splash-loader';

	interface Props {
		getContext: () => Promise<{context: Context; start: () => () => void}>;
		children?: Snippet;
		loading?: Snippet;
		/**
		 * Minimum time in milliseconds to show the loading/splash screen.
		 * If set, the splash screen will be shown for at least this duration,
		 * even if the context loads faster. The timer starts only after the
		 * splash image is fully loaded, ensuring the image doesn't flash briefly.
		 */
		minLoading?: number;
		/**
		 * Custom splash image URL. If not provided, defaults to '/icon.svg'.
		 * Used with minLoading to preload the image before starting the timer.
		 */
		splashImage?: string;
	}

	let {getContext, children, loading, minLoading, splashImage}: Props =
		$props();

	const defaultSplashImage = url('/icon.svg');
	let splashImageUrl = $derived(splashImage ?? defaultSplashImage);

	// Splash-image preload + min-loading timer orchestration lives in the helper.
	// Computed once at init (like the original); reads happen inside the closure.
	function startLoading() {
		return createSplashLoader({
			getContext: () => getContext(),
			splashImageUrl: splashImage ?? defaultSplashImage,
			minLoading,
		});
	}

	let promise = browser ? startLoading() : undefined;
</script>

{#if promise}
	{#await promise}
		{#if loading}
			{@render loading()}
		{:else}
			<div class="splash-screen">
				<img src={splashImageUrl} alt="Loading" class="splash-logo" />
				<span class="sr-only">Loading ...</span>
			</div>
		{/if}
	{:then context}
		<ContextComponent {context}>{@render children?.()}</ContextComponent>
	{:catch error}
		<div
			class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
		>
			<p class="text-lg font-semibold text-destructive">Failed to initialize</p>
			<p class="max-w-md text-sm text-muted-foreground">
				{error?.message || 'Unknown error'}
			</p>
			<button
				class="rounded-md border px-4 py-2 text-sm hover:bg-muted"
				onclick={() => window.location.reload()}
			>
				Reload
			</button>
		</div>
	{/await}
{:else if loading}
	{@render loading()}
{:else}
	<div class="splash-screen">
		<img src={splashImageUrl} alt="Loading" class="splash-logo" />
		<span class="sr-only">Loading ...</span>
	</div>
{/if}

<style>
	.splash-screen {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--background, hsl(var(--background)));
		z-index: 9999;
	}

	.splash-logo {
		width: min(50vw, 50vh);
		height: min(50vw, 50vh);
		max-width: 400px;
		max-height: 400px;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(0.95);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>

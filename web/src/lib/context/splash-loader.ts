import {browser} from '$app/environment';
import type {Context} from './types';

export type ContextBootstrap = {context: Context; start: () => () => void};

/**
 * Preload an image, resolving when it loads (or errors, so it never blocks).
 * Resolves immediately outside the browser or when already cached.
 */
export function preloadImage(src: string): Promise<void> {
	return new Promise((resolve) => {
		if (!browser) {
			resolve();
			return;
		}
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = () => resolve(); // Resolve even on error to not block loading.
		img.src = src;
		// If already cached, the complete flag is set synchronously.
		if (img.complete) resolve();
	});
}

/** Resolve after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the loading promise for the async context:
 * 1. Wait for the splash image to load (only when a minimum is set).
 * 2. Start the minimum-loading timer AFTER the image loads (so it doesn't flash).
 * 3. Resolve once BOTH the context and the timer are done.
 *
 * With no minimum, this is just the context promise.
 */
export async function createSplashLoader(params: {
	getContext: () => Promise<ContextBootstrap>;
	splashImageUrl: string;
	minLoading?: number;
}): Promise<ContextBootstrap> {
	const {getContext, splashImageUrl, minLoading} = params;

	const contextPromise = getContext();

	if (!minLoading || minLoading <= 0) {
		return contextPromise;
	}

	await preloadImage(splashImageUrl);
	const minLoadingPromise = delay(minLoading);

	const [context] = await Promise.all([contextPromise, minLoadingPromise]);
	return context;
}

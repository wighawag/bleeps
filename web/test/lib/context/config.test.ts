import {describe, it, expect} from 'vitest';
import {resolveAppConfig} from '$lib/context/config';
import type {AugmentedChainInfo} from '$lib/core/connection/types';

// Minimal chain stub: resolveAppConfig only reads `.properties`.
const chainWith = (properties?: Record<string, unknown>): AugmentedChainInfo =>
	({properties}) as unknown as AugmentedChainInfo;

describe('resolveAppConfig', () => {
	it('falls back to mainnet-ish defaults when the chain has no properties', () => {
		const cfg = resolveAppConfig(chainWith(undefined));
		expect(cfg.finality).toBe(12);
		expect(cfg.blockTimeMs).toBe(12000);
	});

	it('derives the tx-observer interval as half the block time', () => {
		const cfg = resolveAppConfig(chainWith({averageBlockTimeMs: 4000}));
		expect(cfg.blockTimeMs).toBe(4000);
		expect(cfg.txObserverProcessInterval).toBe(2000);
	});

	it('clamps the tx-observer interval to the 1s minimum for fast chains', () => {
		// 500ms block time -> half is 250ms -> clamped to 1000ms.
		const cfg = resolveAppConfig(chainWith({averageBlockTimeMs: 500}));
		expect(cfg.txObserverProcessInterval).toBe(1000);
	});

	it('reads an explicit finality from chain properties', () => {
		const cfg = resolveAppConfig(chainWith({finality: 1}));
		expect(cfg.finality).toBe(1);
	});
});

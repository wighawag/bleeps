import {describe, it, expect} from 'vitest';
import {
	parseExecutionMode,
	resolveConnectionMode,
} from '../../../../src/lib/core/connection/mode';

describe('parseExecutionMode', () => {
	it("defaults to 'wallet' when empty or absent", () => {
		expect(parseExecutionMode(undefined)).toBe('wallet');
		expect(parseExecutionMode('')).toBe('wallet');
		expect(parseExecutionMode('  ')).toBe('wallet');
	});

	it('accepts wallet and signer (case-insensitive)', () => {
		expect(parseExecutionMode('wallet')).toBe('wallet');
		expect(parseExecutionMode('signer')).toBe('signer');
		expect(parseExecutionMode('SIGNER')).toBe('signer');
		expect(parseExecutionMode('Wallet')).toBe('wallet');
	});

	it('rejects unrecognised values (returns undefined for fail-fast)', () => {
		expect(parseExecutionMode('singer')).toBeUndefined();
		expect(parseExecutionMode('local')).toBeUndefined();
		expect(parseExecutionMode('true')).toBeUndefined();
	});
});

describe('resolveConnectionMode', () => {
	it('WalletConnected + wallet: the default (no walletHost, no mode)', () => {
		const r = resolveConnectionMode(undefined, undefined);
		expect(r).toEqual({
			ok: true,
			mode: {
				targetStep: 'WalletConnected',
				walletHost: undefined,
				executionMode: 'wallet',
			},
		});
	});

	it('SignedIn + wallet: walletHost set, wallet execution', () => {
		const r = resolveConnectionMode('https://example.com', 'wallet');
		expect(r).toEqual({
			ok: true,
			mode: {
				targetStep: 'SignedIn',
				walletHost: 'https://example.com',
				executionMode: 'wallet',
			},
		});
	});

	it('SignedIn + signer: walletHost set, signer execution', () => {
		const r = resolveConnectionMode('https://example.com', 'signer');
		expect(r).toEqual({
			ok: true,
			mode: {
				targetStep: 'SignedIn',
				walletHost: 'https://example.com',
				executionMode: 'signer',
			},
		});
	});

	it('rejects the illegal combination: signer execution without SignedIn', () => {
		const r = resolveConnectionMode(undefined, 'signer');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/PUBLIC_WALLET_HOST/);
	});

	it('rejects unrecognised execution mode values', () => {
		const r = resolveConnectionMode('https://example.com', 'singer');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/Unrecognised/);
	});

	it('treats a whitespace-only walletHost as absent', () => {
		const r = resolveConnectionMode('   ', undefined);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.mode.targetStep).toBe('WalletConnected');
			expect(r.mode.walletHost).toBeUndefined();
		}
	});
});

import {describe, it, expect} from 'vitest';
import {
	mobileWallets,
	detectMobileWalletContext,
} from '../../../../src/lib/core/connection/wallet-catalog';

describe('mobileWallets deep links', () => {
	const url = 'https://app.example.com/path?x=1';
	const byName = (name: string) => mobileWallets.find((w) => w.name === name)!;

	it('builds metamask/rabby links by stripping the protocol', () => {
		expect(byName('MetaMask').getLink(url)).toBe(
			'metamask://dapp/app.example.com/path?x=1',
		);
		expect(byName('Rabby').getLink(url)).toBe(
			'rabby://dapp/app.example.com/path?x=1',
		);
	});

	it('builds trust/coinbase/rainbow links with an encoded url', () => {
		const encoded = encodeURIComponent(url);
		expect(byName('Trust Wallet').getLink(url)).toBe(
			`https://link.trustwallet.com/open_url?url=${encoded}`,
		);
		expect(byName('Coinbase Wallet').getLink(url)).toBe(
			`https://go.cb-w.com/dapp?cb_url=${encoded}`,
		);
		expect(byName('Rainbow').getLink(url)).toBe(
			`rainbow://dapp?url=${encoded}`,
		);
	});
});

describe('detectMobileWalletContext', () => {
	const base = {
		userAgent: 'Mozilla/5.0 (iPhone)',
		maxTouchPoints: 5,
		hasOntouchstart: true,
		innerWidth: 390,
		hasInjectedProvider: false,
	};

	it('is true on a small touch/mobile device with no injected provider', () => {
		expect(detectMobileWalletContext(base)).toBe(true);
	});

	it('is false inside a dApp browser (injected provider)', () => {
		expect(
			detectMobileWalletContext({...base, hasInjectedProvider: true}),
		).toBe(false);
	});

	it('is false on a large desktop screen', () => {
		expect(
			detectMobileWalletContext({
				...base,
				userAgent: 'Mozilla/5.0 (Macintosh)',
				maxTouchPoints: 0,
				hasOntouchstart: false,
				innerWidth: 1920,
			}),
		).toBe(false);
	});
});

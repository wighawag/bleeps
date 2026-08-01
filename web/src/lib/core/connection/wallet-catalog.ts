/**
 * Wallet download catalog, mobile deep-link builders, and mobile-device
 * detection for the "no wallet" flow. Kept out of the .svelte file so the data
 * and the URL/deep-link logic are testable and reusable.
 */

export type DownloadWallet = {
	name: string;
	description: string;
	mobileDescription?: string;
	icon: string;
	url: string;
};

export type MobileWallet = {
	name: string;
	description: string;
	icon: string;
	getLink: (url: string) => string;
};

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');

export const downloadWallets: readonly DownloadWallet[] = [
	{
		name: 'MetaMask',
		description: 'Popular browser extension wallet',
		mobileDescription: 'Popular mobile wallet',
		icon: '/wallets/metamask/MetaMask-icon-fox.svg',
		url: 'https://metamask.io/download/',
	},
	{
		name: 'Trust Wallet',
		description: 'Powerful Web3 experiences',
		icon: '/wallets/trust/trust-icon.svg',
		url: 'https://trustwallet.com/',
	},
	{
		name: 'Rainbow',
		description: 'Experience Crypto in Color',
		icon: '/wallets/rainbow/rainbow-icon.svg',
		url: 'https://rainbow.me/',
	},
	{
		name: 'Rabby',
		description: 'Your Go-to wallet for Ethereum',
		icon: '/wallets/rabby/rabby-icon.svg',
		url: 'https://rabby.io/',
	},
	{
		name: 'Coinbase Wallet',
		description: 'Your key to the world of crypto',
		icon: '/wallets/coinbase/coinbase-icon.svg',
		url: 'https://www.coinbase.com/wallet',
	},
];

export const mobileWallets: readonly MobileWallet[] = [
	{
		name: 'MetaMask',
		description: 'Open in MetaMask Browser',
		icon: '/wallets/metamask/MetaMask-icon-fox.svg',
		getLink: (url) => `metamask://dapp/${stripProtocol(url)}`,
	},
	{
		name: 'Trust Wallet',
		description: 'Open in Trust Wallet',
		icon: '/wallets/trust/trust-icon.svg',
		getLink: (url) =>
			`https://link.trustwallet.com/open_url?url=${encodeURIComponent(url)}`,
	},
	{
		name: 'Coinbase Wallet',
		description: 'Open in Coinbase Wallet',
		icon: '/wallets/coinbase/coinbase-icon.svg',
		getLink: (url) =>
			`https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
	},
	{
		name: 'Rainbow',
		description: 'Open in Rainbow',
		icon: '/wallets/rainbow/rainbow-icon.svg',
		getLink: (url) => `rainbow://dapp?url=${encodeURIComponent(url)}`,
	},
	{
		name: 'Rabby',
		description: 'Open in Rabby',
		icon: '/wallets/rabby/rabby-icon.svg',
		getLink: (url) => `rabby://dapp/${stripProtocol(url)}`,
	},
];

/**
 * Decide whether to offer the mobile "open in wallet app" flow: a small,
 * touch/mobile-OS device that is NOT already inside a wallet's dApp browser
 * (which would inject a provider).
 */
export function detectMobileWalletContext(env: {
	userAgent: string;
	maxTouchPoints: number;
	hasOntouchstart: boolean;
	innerWidth: number;
	hasInjectedProvider: boolean;
}): boolean {
	const hasTouch = env.hasOntouchstart || env.maxTouchPoints > 0;
	const isSmallScreen = env.innerWidth <= 1024;
	const isMobileOS = /Android|iPhone|iPad|iPod/i.test(env.userAgent);
	return isSmallScreen && (hasTouch || isMobileOS) && !env.hasInjectedProvider;
}

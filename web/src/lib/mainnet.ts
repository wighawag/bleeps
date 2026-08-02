/**
 * The Bleeps contracts on Ethereum mainnet.
 *
 * Fixed on purpose, and NOT read from `deployments`. The footer is describing
 * the project, not the chain the app happens to be pointed at: a build for a dev
 * chain or for `demo` should still tell a reader where the real Bleeps live, and
 * link them to a block explorer that has them. Deriving these from the current
 * deployment would make the footer of a local build point at contracts nobody
 * else can see.
 *
 * They can never change: all three are deployed, immutable, and the DAO owns
 * them. `test/lib/mainnet.test.ts` holds them to the deployment record in
 * `contracts/deployments/mainnet`, so a typo here cannot survive.
 */
export type MainnetContract = {
	/** How the site refers to it in prose. */
	label: string;
	address: `0x${string}`;
};

export const MAINNET_CONTRACTS: readonly MainnetContract[] = [
	{
		label: "Bleeps contract's address",
		address: '0x9d27527Ada2CF29fBDAB2973cfa243845a08Bd3F',
	},
	{
		label: "Bleeps DAO Account's address",
		address: '0xf850cEB782707df66A49b861fF74436Be271611e',
	},
	{
		label: "Bleeps DAO Governance contract's address",
		address: '0x3Dca1174b82e100A5f12e230AE803002edCDeE1C',
	},
] as const;

export function etherscanAddress(address: string): string {
	return `https://etherscan.io/address/${address}`;
}

export const REPO_URL = 'https://github.com/wighawag/bleeps';
export const TWITTER_URL = 'https://twitter.com/bleepsDAO';
export const DISCORD_URL = 'https://discord.com/invite/DRtq7xBdtn';
export const OPENSEA_URL = 'https://opensea.io/collection/bleeps';

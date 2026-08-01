// ----------------------------------------------------------------------------
// Typed Config
// ----------------------------------------------------------------------------
import type {
	EnhancedEnvironment,
	UnknownDeployments,
	UserConfig,
} from 'rocketh/types';

// this one provide a protocol supporting private key as account
import {privateKey} from '@rocketh/signer';
import {parseEther} from 'viem';

// ----------------------------------------------------------------------------
// Roles, as deployed.
//
// `creator` and `initialAdmin` are the mainnet Bleeps roles and must not change:
// they are baked into the live deployment. The demo pair is the Sepolia
// equivalent and is only ever used by the `demo` environment.
// ----------------------------------------------------------------------------
const creator = '0x8350c9989ef11325b36ce6f7549004d418dbcee7';
const initialAdmin = '0xdcA9d1FA839bB9Fe65DDC4de5161BCA43751D4B4';

const demoCreator = '0xE53cd71271AcAdbeb0f64d9c8C62bBdDc8cA9e66';
const demoAdmin = '0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20';

// ----------------------------------------------------------------------------
// Which deploy scripts run where.
//
// This replaces hardhat-deploy v1's per-network `deploy:` array. The important
// property is that the TOP-LEVEL `scripts` default is the PRODUCTION set: an
// environment nobody thought to configure gets the safe list, never the dev
// one. Dev-only concerns (the WETH/OpenSea mocks, the initial Bleeps
// distribution, the funded DAO) have to be opted into by name.
//
// The Bleeps sale is over on mainnet and the melody sale has not happened yet,
// so nothing here deploys a sale contract. The sale contracts stay compiled and
// tested, and `003_dev` reproduces the "everyone owns some Bleeps" end state
// that mainnet already has, so the app can be exercised locally.
// ----------------------------------------------------------------------------
export const productionScripts = [
	'deploy/001_bleeps',
	'deploy/002_bleepsdao',
	'deploy/006_melobleeps',
];

/**
 * What the contract tests deploy: the production graph plus the dev mocks, but
 * WITHOUT the seeding in `003_dev`.
 *
 * The tests need an unminted Bleeps contract, because what most of them are
 * about is minting, transferring and voting from a known starting point. Seed
 * data would not make them more realistic, it would just take the starting
 * point away.
 */
export const testScripts = [
	'deploy/000_externals',
	'deploy/001_bleeps',
	'deploy/002_bleepsdao',
	'deploy/006_melobleeps',
];

export const devScripts = [
	'deploy/000_externals',
	'deploy/001_bleeps',
	'deploy/002_bleepsdao',
	'deploy/003_dev',
	'deploy/006_melobleeps',
];

// we define our config and export it as "config"
export const config = {
	accounts: {
		deployer: {
			default: 0,
		},

		// can set ENS name and withdraw ERC20 accidentally sent to the Bleeps
		// contract. Handed to the DAO as part of the deployment process.
		initialBleepsOwner: {
			default: 'deployer',
		},

		// can set the tokenURI contract
		initialBleepsTokenURIAdmin: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// can set a new minter contract
		initialBleepsMinterAdmin: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// can set royalties
		initialBleepsRoyaltyAdmin: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// can remove DAO rights
		bleepsGuardian: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// changeable by royaltyAdmin later
		initialBleepsRoyaltyRecipient: {
			default: 1,
			mainnet: creator,
			demo: demoCreator,
		},

		// can disable the gas-expensive checkpointing, which would require a new
		// governance mechanism. Revoked later.
		initialCheckpointingDisabler: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// receives the creator fee (25%)
		projectCreator: {
			default: 1,
			mainnet: creator,
			demo: demoCreator,
		},

		// can block proposals, meant to protect the DAO in its early days. Revoked.
		daoVetoer: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		// can stop the governance mechanism being switched out, so that Bleeps
		// always remain the voting rights. Revoked when used.
		daoGuardian: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},

		initialMeloBleepsOwner: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},
		initialMeloBleepsTokenURIAdmin: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},
		initialMeloBleepsRoyaltyAdmin: {
			default: 1,
		},
		initialMeloBleepsMinterAdmin: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},
		melobleepsGuardian: {
			default: 1,
			mainnet: initialAdmin,
			demo: demoAdmin,
		},
	},
	data: {
		// TimelockController minimum delay, in seconds. 2 days, as deployed.
		minTimelockDelay: {
			default: '172800',
		},
	},
	defaultChainProperties: {
		expectedWorstGasPrice: parseEther('0.000001', 'gwei'),
	},
	// Safe default: an environment that is not listed below gets the production
	// script set, not the dev one.
	scripts: productionScripts,
	environments: {
		// The local dev chain mines immediately, so a deploy never waits on the
		// node's block interval.
		localhost: {
			chain: 31337,
			scripts: devScripts,
			overrides: {
				autoMine: true,
			},
		},
		// Sepolia. Bleeps are sold out on mainnet, so `demo` reproduces the sale
		// and the resulting distribution in order to keep the full experience
		// reachable. See docs/adr/0001-dev-only-sale-and-distribution.md.
		demo: {
			chain: 11155111,
			scripts: devScripts,
		},
		mainnet: {
			chain: 1,
			scripts: productionScripts,
		},
	},
	signerProtocols: {
		privateKey,
	},
} as const satisfies UserConfig;

// then we import each extension we are interested in using in our deploy
// scripts or elsewhere

// this one provide a deploy function
import * as deployExtension from '@rocketh/deploy';
// this one provide read,execute functions
import * as readExecuteExtension from '@rocketh/read-execute';
// this one provide a viem handle to clients and contracts
import * as viemExtension from '@rocketh/viem';

// and export them as a unified object
const extensions = {
	...deployExtension,
	...readExecuteExtension,
	...viemExtension,
};
export {extensions};

// then we also export the types that our config exhibits so others can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;
type Environment = EnhancedEnvironment<
	Accounts,
	Data,
	UnknownDeployments,
	Extensions
>;

export type {Extensions, Accounts, Data, Environment};

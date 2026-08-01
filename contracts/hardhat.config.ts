import type {HardhatUserConfig} from 'hardhat/config';

import HardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import HardhatViem from '@nomicfoundation/hardhat-viem';
import HardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import HardhatKeystore from '@nomicfoundation/hardhat-keystore';

import HardhatDeploy from 'hardhat-deploy';
import {
	addForkConfiguration,
	addNetworksFromEnv,
	addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';

// ----------------------------------------------------------------------------
// Compiler settings.
//
// These reproduce the mainnet deployment exactly: solc 0.8.9, optimizer on with
// runs=999999, evmVersion london (0.8.9's default, pinned here so a future solc
// default cannot silently move it). `pnpm verify:bytecode` checks this against
// the committed deployments and must stay green.
//
// Unlike the template, the DEFAULT profile carries the same optimizer settings
// as production. Bleeps' runtime bytecode is 24,307 bytes against the EIP-170
// limit of 24,576, so an unoptimised build is not merely slower, it is
// undeployable. Keeping the profiles aligned means the dev chain deploys the
// same code the tests and mainnet do.
// ----------------------------------------------------------------------------
const bleepsCompiler = {
	version: '0.8.9',
	settings: {
		optimizer: {
			enabled: true,
			runs: 999999,
		},
		evmVersion: 'london',
	},
};

// Only for src/externals/WETH9.sol, the canonical WETH source, deployed as a
// mock on dev chains. Live chains use the canonical WETH, see deploy/utils.ts.
const weth9Compiler = {
	version: '0.4.19',
	settings: {
		optimizer: {
			enabled: false,
			runs: 200,
		},
	},
};

const compilers = [bleepsCompiler, weth9Compiler];

const config: HardhatUserConfig = {
	plugins: [
		HardhatNodeTestRunner,
		HardhatViem,
		HardhatNetworkHelpers,
		HardhatKeystore,
		HardhatDeploy,
	],
	solidity: {
		profiles: {
			default: {
				compilers,
			},
			production: {
				compilers,
			},
		},
	},
	networks:
		// This adds the fork configuration for the chosen network
		addForkConfiguration(
			// this adds a network config for all known chains using kebab-case names
			// Note that MNEMONIC_<network> (or MNEMONIC if the other is not set)
			// will be used for accounts.
			// Similarly ETH_NODE_URI_<network> will be used for rpcUrl.
			// If you set these env variables to the value "SECRET" it will be like
			// using configVariable('SECRET_ETH_NODE_URI_<network>').
			addNetworksFromKnownList(
				// this adds a network for each respective env var found
				// (ETH_NODE_URI_<network>), reading MNEMONIC_<network> for accounts
				addNetworksFromEnv({
					default: {
						type: 'edr-simulated',
						chainType: 'l1',
						accounts: {
							mnemonic: process.env.MNEMONIC || undefined,
						},
						// Bleeps' tokenURI is a heavy on-chain renderer and the DAO
						// tests submit large proposals.
						blockGasLimit: 50_000_000,
					},

					// `local` is the network used by `hardhat --network local node`,
					// i.e. the long-running dev chain (see `pnpm node:local`).
					local: {
						type: 'edr-simulated',
						chainType: 'l1',
						accounts: {
							mnemonic: process.env.MNEMONIC || undefined,
						},
						blockGasLimit: 50_000_000,
						// A reverting transaction must still be mined, otherwise the
						// app never sees the failed receipt it needs to report the error.
						throwOnTransactionFailures: false,
					},
				}),
			),
		),
	paths: {
		sources: ['src'],
	},
	generateTypedArtifacts: {
		destinations: [
			{
				folder: './generated',
				mode: 'typescript',
			},
		],
	},
};

export default config;

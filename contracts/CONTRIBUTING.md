# Contracts - Developer Guide

This guide covers the architecture, patterns, and conventions for contributing to the smart contracts package.

## Quick Links

- [Architecture Overview](#architecture-overview)
- [Code Patterns](#code-patterns)
- [Folder Structure](#folder-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture Overview

### Tech Stack

- **Framework**: Hardhat v3
- **Deployment**: rocketh (v0.19+) with hardhat-deploy v2
- **Testing**: Node.js test runner + Foundry (dual framework)
- **TypeScript**: Full type safety with generated ABI types
- **Proxy Pattern**: ERC1967 via `@rocketh/proxy`

### Key Concepts

1. **Hot Contract Replacement (HCR)**: Edit contracts and see changes live during development
2. **Declarative Proxy Deployment**: `deployViaProxy` for upgradeable contracts
3. **Dual Testing**: Both Foundry (Solidity) and Hardhat (TypeScript) tests
4. **Named Accounts**: Clean account management via configuration
5. **Environment-Based Configuration**: Networks configured via environment variables

---

## Folder Structure

```
contracts/
├── src/
│   └── <Feature>/
│       ├── <Feature>.sol           # Main contract implementation
│       ├── I<Feature>.sol          # Interface definition
│       └── <Feature>.t.sol         # Foundry tests
├── deploy/
│   ├── 001_<feature>.ts            # Deployment scripts (ordered by prefix)
│   └── ...
├── test/
│   ├── <Feature>.test.ts           # Hardhat tests
│   └── utils/
│       └── index.ts                # Test fixtures
├── rocketh/
│   ├── config.ts                   # Accounts, extensions, environment config
│   ├── deploy.ts                   # Deploy script helpers
│   └── environment.ts              # Environment loading utilities
├── scripts/
│   ├── <script>.ts                 # Interaction scripts
│   └── tsconfig.json               # Script-specific TS config
├── generated/
│   ├── abis/                       # Generated TypeScript ABI types
│   └── artifacts/                  # Generated full artifacts
├── deployments/
│   ├── localhost/                  # Local deployment artifacts
│   ├── sepolia/                    # Sepolia deployments
│   └── <network>/                  # Per-network deployments
├── hardhat.config.ts               # Hardhat v3 configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # Base TypeScript config
├── slippy.config.js                # Solidity linter config
├── remappings.txt                  # Foundry remappings
└── .env / .env.local               # Environment configuration (gitignored)
```

### Import Paths

```typescript
// Generated types
import {Abi_GreetingsRegistry} from '../generated/abis/GreetingsRegistry.js';

// Rocketh helpers
import {deployScript, artifacts} from '../rocketh/deploy.js';
import {loadEnvironmentFromHardhat} from '../rocketh/environment.js';

// Test utilities
import {setupFixtures} from './utils/index.js';
```

---

## Code Patterns

### Solidity Contract Pattern

**Proxy-Ready Design**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IYourContract} from './IYourContract.sol';
import {Proxied} from '@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol';

contract YourContract is IYourContract, Proxied {
	event YourEvent(address indexed user, string data);
	error YourError(string reason);

	// Dual initialization (constructor + proxy init)
	constructor(string memory param) {
		_init(param);
	}

	function _init(string memory param) internal {
		// initialization logic
	}

	function init(string memory param) external asProxyInitialiser {
		_init(param);
	}

	// Business logic
	function yourFunction() external {
		// implementation
	}
}
```

**Key Points**:

- ✅ Inherit from `Proxied` for ERC1967 proxy support
- ✅ Separate interface in `I<Contract>.sol`
- ✅ Use custom errors instead of require strings
- ✅ Emit events for state changes
- ✅ Support both constructor and proxy initialization

### Interface Pattern

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IYourContract {
	// Events
	event YourEvent(address indexed user, string data);

	// Errors
	error YourError(string reason);

	// Functions
	function yourFunction() external;
	function viewFunction() external view returns (string memory);
}
```

### Deployment Script Pattern

```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer, admin} = env.namedAccounts;

		// Deploy upgradeable contract via proxy
		const deployment = await env.deployViaProxy(
			'YourContract',
			{
				account: deployer,
				artifact: artifacts.YourContract,
				args: ['constructor arg'],
			},
			{
				owner: admin,
				execute: 'init',
				linkedData: {
					// Metadata stored with deployment
					someConfig: 'value',
				},
				deterministicImplementation: true,
			},
		);

		// Interact with deployed contract
		const contract = env.viem.getContract(deployment);
		const result = await contract.read.yourFunction();
	},
	{tags: ['YourContract']},
);
```

**Key Points**:

- ✅ Use `deployScript` factory function
- ✅ Named accounts from `env.namedAccounts`
- ✅ `deployViaProxy` for upgradeable contracts
- ✅ `linkedData` for metadata
- ✅ `tags` for selective deployment
- ✅ Use `env.viem` for contract interaction

### Test Pattern (Hardhat)

```typescript
import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('YourContract', function () {
	describe('yourFunction', function () {
		it('should do something', async function () {
			const {env, YourContract, unnamedAccounts} =
				await networkHelpers.loadFixture(deployAll);
			const user = unnamedAccounts[0];

			await env.execute(YourContract, {
				functionName: 'yourFunction',
				args: ['arg1'],
				account: user,
			});

			const result = await env.read(YourContract, {
				functionName: 'viewFunction',
				args: [user],
			});

			expect(result).toEqual('expected value');
		});

		it('should revert on invalid input', async function () {
			const {env, YourContract, unnamedAccounts} =
				await networkHelpers.loadFixture(deployAll);
			const user = unnamedAccounts[0];

			await expect(
				env.execute(YourContract, {
					functionName: 'yourFunction',
					args: ['invalid'],
					account: user,
				}),
			).toBeRejectedWith(`custom error 'YourError("reason")'`);
		});
	});
});
```

**Key Points**:

- ✅ Use `node:test` with `earl` assertions
- ✅ Fixture pattern with `loadFixture` for test isolation
- ✅ `env.read()` and `env.execute()` for contract interaction
- ✅ Test both success and failure cases

### Test Pattern (Foundry)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {YourContract} from "../src/YourContract/YourContract.sol";

contract YourContractTest is Test {
    YourContract public contract;
    address public user;

    function setUp() public {
        user = address(1);
        contract = new YourContract("prefix:");
    }

    function test_YourFunction() public {
        vm.prank(user);
        contract.yourFunction();

        // assertions
    }

    function test_RevertWhen_InvalidInput() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("YourError(string)", "reason"));
        contract.yourFunction();
    }
}
```

---

## Configuration

### Hardhat Config (hardhat.config.ts)

```typescript
import type {HardhatUserConfig} from 'hardhat/config';
import {
	addForkConfiguration,
	addNetworksFromEnv,
	addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';

const config: HardhatUserConfig = {
	plugins: [
		// Add your plugins
	],
	solidity: {
		profiles: {
			default: {version: '0.8.28'},
			production: {
				version: '0.8.28',
				settings: {
					optimizer: {enabled: true, runs: 999999},
				},
			},
		},
	},
	networks: addForkConfiguration(
		addNetworksFromKnownList(
			addNetworksFromEnv({
				// Add custom networks here
				local: {
					type: 'edr-simulated',
					chainType: 'l1',
					mining: {interval: 3000},
				},
			}),
		),
	),
	generateTypedArtifacts: {
		destinations: [{folder: './generated', mode: 'typescript'}],
	},
};

export default config;
```

### Rocketh Config (rocketh/config.ts)

```typescript
import type {UserConfig} from 'rocketh/types';
import {privateKey} from '@rocketh/signer';

export const config = {
	accounts: {
		deployer: {default: 0},
		admin: {default: 1},
	},
	environments: {
		localhost: {
			chain: 31337,
			overrides: {autoMine: true},
		},
	},
	signerProtocols: {
		privateKey,
	},
} as const satisfies UserConfig;

// Extensions
import * as deployExtension from '@rocketh/deploy';
import * as readExecuteExtension from '@rocketh/read-execute';
import * as deployProxyExtension from '@rocketh/proxy';
import * as viemExtension from '@rocketh/viem';

const extensions = {
	...deployExtension,
	...readExecuteExtension,
	...deployProxyExtension,
	...viemExtension,
};
export {extensions};
```

### Environment Variables

Create `.env` or `.env.local` (gitignored):

```bash
# RPC endpoints
ETH_NODE_URI_sepolia="https://..."
ETH_NODE_URI_mainnet="https://..."

# Mnemonics (network-specific or fallback)
MNEMONIC_sepolia="your mnemonic here"
MNEMONIC="fallback mnemonic"

# Etherscan API key for verification
ETHERSCAN_API_KEY="your-api-key"
```

**Using Secret Store**:

```bash
# Set to "SECRET" to use hardhat-keystore
ETH_NODE_URI_mainnet=SECRET
MNEMONIC_mainnet=SECRET
```

Then run:

```bash
pnpm hardhat config-variable set SECRET_ETH_NODE_URI_mainnet "https://..."
```

---

## Development Workflow

### Setup

```bash
# Install dependencies
pnpm i

# Compile contracts
pnpm contracts:compile

# Compile with watch mode
pnpm contracts:compile:watch
```

### Testing

```bash
# Run all tests (Hardhat + Foundry)
pnpm contracts:test

# Run Hardhat tests only
pnpm hardhat test

# Run Foundry tests only
forge test

# Watch mode
pnpm contracts:test:watch
```

### Deployment

```bash
# Deploy to localhost
pnpm contracts:deploy localhost --skip-prompts

# Deploy to testnet
pnpm contracts:deploy sepolia

# Deploy with specific tags
pnpm contracts:deploy sepolia --tags YourContract

# Verify on Etherscan
pnpm contracts:verify sepolia

# Export to frontend
pnpm contracts:export sepolia --ts ../web/src/lib/deployments.ts
```

### Full Development Flow

```bash
# Start everything (requires Zellij)
pnpm start

# Or manually:
# 1. Start local node
pnpm contracts:node:local

# 2. Compile and deploy (watch mode)
pnpm contracts:compile:watch
pnpm contracts:deploy:watch

# 3. Export to frontend
pnpm contracts:export localhost --ts ../web/src/lib/deployments.ts
```

---

## Adding New Contracts

### Step 1: Create Contract Files

```bash
mkdir -p src/YourFeature
touch src/YourFeature/YourFeature.sol
touch src/YourFeature/IYourFeature.sol
touch src/YourFeature/YourFeature.t.sol
```

### Step 2: Write Contract

```solidity
// src/YourFeature/IYourFeature.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IYourFeature {
	event FeatureEvent(address indexed user, bytes32 data);
	error FeatureError(string reason);
	function yourFunction() external;
}
```

```solidity
// src/YourFeature/YourFeature.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IYourFeature} from './IYourFeature.sol';
import {Proxied} from '@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol';

contract YourFeature is IYourFeature, Proxied {
	constructor() {
		_init();
	}

	function _init() internal {}

	function init() external asProxyInitialiser {
		_init();
	}

	function yourFunction() external {
		emit FeatureEvent(msg.sender, bytes32(0));
	}
}
```

### Step 3: Write Tests

**Foundry Test**:

```solidity
// src/YourFeature/YourFeature.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {YourFeature} from "../src/YourFeature/YourFeature.sol";

contract YourFeatureTest is Test {
    YourFeature public contract;

    function setUp() public {
        contract = new YourFeature();
    }

    function test_YourFunction() public {
        contract.yourFunction();
        // assertions
    }
}
```

**Hardhat Test**:

```typescript
// test/YourFeature.test.ts
import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from './utils/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('YourFeature', function () {
	it('should work', async function () {
		const {env, YourFeature} = await networkHelpers.loadFixture(deployAll);
		// test implementation
	});
});
```

### Step 4: Write Deployment Script

```typescript
// deploy/001_deploy_your_feature.ts
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer, admin} = env.namedAccounts;

		const deployment = await env.deployViaProxy(
			'YourFeature',
			{
				account: deployer,
				artifact: artifacts.YourFeature,
				args: [],
			},
			{
				owner: admin,
				execute: 'init',
				linkedData: {},
				deterministicImplementation: true,
			},
		);
	},
	{tags: ['YourFeature']},
);
```

### Step 5: Run Tests and Deploy

```bash
# Test
pnpm contracts:test

# Deploy locally
pnpm contracts:deploy localhost --skip-prompts

# Export to frontend
pnpm contracts:export localhost --ts ../web/src/lib/deployments.ts
```

---

## Script Pattern

For interaction scripts:

```typescript
// scripts/yourScript.ts
import {loadEnvironmentFromHardhat} from '../rocketh/environment.js';
import {Abi_YourContract} from '../generated/abis/YourContract.js';

const env = await loadEnvironmentFromHardhat({
	extensions: await import('../rocketh/config.js').then((m) => m.extensions),
});

const contract = env.viem.getContract({
	abi: Abi_YourContract,
	address: env.deployments.YourContract.address,
});

const result = await contract.read.yourFunction();
console.log(result);
```

Run with:

```bash
pnpm contracts:execute scripts/yourScript.ts
```

---

## Linting

### Solidity

```bash
pnpm contracts:lint
```

Configured in `slippy.config.js`:

```javascript
export default {
	ignores: ['**/*.t.sol'],
};
```

### Formatting

```bash
pnpm format        # Format all code
pnpm format:check  # Check formatting
```

---

## Common Pitfalls

### 1. Proxy Initialization

**DO**:

```solidity
constructor(string memory param) {
    _init(param);
}

function init(string memory param) external asProxyInitialiser {
    _init(param);
}
```

**DON'T**:

```solidity
// ❌ Only constructor - won't work with proxies
constructor(string memory param) {
    _prefix = param;
}
```

### 2. Named Accounts

**DO**:

```typescript
const {deployer, admin} = env.namedAccounts;
```

**DON'T**:

```typescript
// ❌ Hardcoding addresses
const deployer = '0x...';
```

### 3. Gas Limits

**DO**:

```typescript
// Let Hardhat estimate
await env.execute(Contract, {
	functionName: 'yourFunction',
	args: ['arg'],
	account: user,
});
```

**DON'T**:

```typescript
// ❌ Hardcoded gas limits
await env.execute(Contract, {
	functionName: 'yourFunction',
	args: ['arg'],
	account: user,
	gas: 1000000n,
});
```

### 4. Environment Variables

**DO**:

```bash
# Use .env.local (gitignored)
ETH_NODE_URI_sepolia="https://..."
```

**DON'T**:

```bash
# ❌ Commit sensitive data to .env
# .env is tracked in git for template defaults
```

---

## Code Review Checklist

- [ ] Contract inherits from `Proxied` for upgradeability
- [ ] Interface in separate `I<Contract>.sol` file
- [ ] Uses custom errors instead of require strings
- [ ] Events emitted for state changes
- [ ] Dual initialization (constructor + proxy init)
- [ ] Solidity pragma matches config (`^0.8.28`)
- [ ] NatSpec documentation on public/external functions
- [ ] Tests in both Foundry and Hardhat
- [ ] Deployment script uses `deployViaProxy`
- [ ] Named accounts used (not hardcoded addresses)
- [ ] Tags specified for deployment script
- [ ] No sensitive data in committed files

---

## Resources

- [Hardhat v3 Docs](https://hardhat.org/docs)
- [rocketh Docs](https://github.com/wighawag/hardhat-deploy/tree/v2#readme)
- [Foundry Book](https://book.getfoundry.sh/)
- [Viem Docs](https://viem.sh/docs)
- [ERC1967 Proxy Pattern](https://eips.ethereum.org/EIPS/eip-1967)

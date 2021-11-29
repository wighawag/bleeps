import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';
import {node_url, accounts} from './utils/network';
import './utils/metadata';

// While waiting for hardhat PR: https://github.com/nomiclabs/hardhat/pull/1542
if (process.env.HARDHAT_FORK) {
  process.env['HARDHAT_DEPLOY_FORK'] = process.env.HARDHAT_FORK;
}

const creator = '0x8350c9989ef11325b36ce6f7549004d418dbcee7';
const initialAdmin = '0xdcA9d1FA839bB9Fe65DDC4de5161BCA43751D4B4';

const stagingCreator = '0xcE1AEF3e0A5324F7AB6e21B4dacc10B82666E1e2';
const stagingAdmin = '0xCcFe9B3769473eeBb45a592313583616038f6274';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,

    // can set ENS name and withdraw ERC20 accidently sent to Bleeps contract => DAO
    initialBleepsOwner: {
      default: 'deployer', // right is given to the dao as part of the deployment process
    },

    // can set the tokenURI => keep on initialAdmin for a while, in case any issue arise, then DAO
    initialBleepsTokenURIAdmin: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // can set new minter contract => keep on initialAdmin until initial sale is over in case any issue arise, then DAO
    initialBleepsMinterAdmin: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // can set royalties => keep on initialAdmin for now.
    initialBleepsRoyaltyAdmin: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // can remove DAO rights => keep on initialAdmin for now. Revoke fully later.
    bleepsGuardian: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // this will be changeable by royaltyAdmin later
    initialBleepsRoyaltyRecipient: {
      default: 1,
      mainnet: creator,
      staging: stagingCreator,
    },

    // can disable the gas expensive checkpointing, would require a new governance mechanism  => keep on initialAdmin for now and then revoke.
    initialCheckpointingDisabler: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // this will receive the creator fee (25%)
    projectCreator: {
      default: 1,
      mainnet: creator,
      staging: stagingCreator,
    },

    // can block proposals (meant to protect the DAO in early days), will be revoked
    daoVetoer: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // can prevent the governance mechanism to switch to a new mechanism. To ensure Bleeps will always be the voting rights
    // revoked when used
    daoGuardian: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },

    // TODO comments:
    initialMeloBleepsOwner: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },
    initialMeloBleepsTokenURIAdmin: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },
    initialMeloBleepsRoyaltyAdmin: 1,
    initialMeloBleepsMinterAdmin: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },
    melobleepsGuardian: {
      default: 1,
      mainnet: initialAdmin,
      staging: stagingAdmin,
    },
  },
  networks: {
    hardhat: {
      // TODO
      blockGasLimit: 50000000,
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      // process.env.HARDHAT_FORK will specify the network that the fork is made from.
      // this line ensure the use of the corresponding accounts
      accounts: accounts(process.env.HARDHAT_FORK),
      forking: process.env.HARDHAT_FORK
        ? {
            // TODO once PR merged : network: process.env.HARDHAT_FORK,
            url: node_url(process.env.HARDHAT_FORK),
            blockNumber: process.env.HARDHAT_FORK_NUMBER ? parseInt(process.env.HARDHAT_FORK_NUMBER) : undefined,
          }
        : undefined,
      mining: process.env.MINING_INTERVAL
        ? {
            auto: false,
            interval: process.env.MINING_INTERVAL.split(',').map((v) => parseInt(v)) as [number, number],
          }
        : undefined,
    },
    localhost: {
      url: node_url('localhost'),
      accounts: accounts(),
    },
    staging: {
      url: node_url('goerli'),
      accounts: accounts('goerli'),
      deploy: ['deploy/001_bleeps', 'deploy/002_bleepsdao', 'deploy/003_bleeps_sale', 'deploy/004_bleeps_setup'],
    },
    mainnet: {
      url: node_url('mainnet'),
      accounts: accounts('mainnet'),
      deploy: ['deploy/001_bleeps', 'deploy/002_bleepsdao', 'deploy/003_bleeps_sale', 'deploy/004_bleeps_setup'],
    },
    rinkeby: {
      url: node_url('rinkeby'),
      accounts: accounts('rinkeby'),
      deploy: ['deploy/001_bleeps', 'deploy/002_bleepsdao', 'deploy/003_bleeps_sale', 'deploy/004_bleeps_setup'],
    },
    kovan: {
      url: node_url('kovan'),
      accounts: accounts('kovan'),
    },
    staging2: {
      url: node_url('goerli'),
      accounts: accounts('goerli'),
      deploy: ['deploy/001_bleeps', 'deploy/002_bleepsdao', 'deploy/003_bleeps_sale', 'deploy/004_bleeps_setup'],
    },
  },
  paths: {
    sources: 'src',
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    maxMethodDiff: 10,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
  },
  external: process.env.HARDHAT_FORK
    ? {
        deployments: {
          // process.env.HARDHAT_FORK will specify the network that the fork is made from.
          // these lines allow it to fetch the deployments from the network being forked from both for node and deploy task
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
          localhost: ['deployments/' + process.env.HARDHAT_FORK],
        },
      }
    : undefined,
};

export default config;

import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-deploy-tenderly';
import {node_url, accounts, addForkConfiguration} from './utils/network';
const creator = '0x8350c9989ef11325b36ce6f7549004d418dbcee7';
const initialAdmin = '0xdcA9d1FA839bB9Fe65DDC4de5161BCA43751D4B4';

const demoCreator = '0xcE1AEF3e0A5324F7AB6e21B4dacc10B82666E1e2';
const demoAdmin = '0xCcFe9B3769473eeBb45a592313583616038f6274';

const devDeploy = [
  'deploy/000_externals',
  'deploy/001_bleeps',
  'deploy/002_bleepsdao',
  'deploy/003_dev',
  'deploy/004_bleeps_setup',
  'deploy/006_melobleeps',
];

const productionDeploy = [
  // 'deploy/000_externals',
  'deploy/001_bleeps',
  'deploy/002_bleepsdao',
  // 'deploy/004_bleeps_setup',
  'deploy/006_melobleeps',
];

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
      {
        version: '0.4.19',
        settings: {
          optimizer: {
            enabled: false,
            run: 200,
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
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // can set new minter contract => keep on initialAdmin until initial sale is over in case any issue arise, then DAO
    initialBleepsMinterAdmin: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // can set royalties => keep on initialAdmin for now.
    initialBleepsRoyaltyAdmin: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // can remove DAO rights => keep on initialAdmin for now. Revoke fully later.
    bleepsGuardian: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // this will be changeable by royaltyAdmin later
    initialBleepsRoyaltyRecipient: {
      default: 1,
      mainnet: creator,
      demo: demoCreator,
      rinkeby: demoCreator,
    },

    // can disable the gas expensive checkpointing, would require a new governance mechanism  => keep on initialAdmin for now and then revoke.
    initialCheckpointingDisabler: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // this will receive the creator fee (25%)
    projectCreator: {
      default: 1,
      mainnet: creator,
      demo: demoCreator,
      rinkeby: demoCreator,
    },

    // can block proposals (meant to protect the DAO in early days), will be revoked
    daoVetoer: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // can prevent the governance mechanism to switch to a new mechanism. To ensure Bleeps will always be the voting rights
    // revoked when used
    daoGuardian: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },

    // TODO comments:
    initialMeloBleepsOwner: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },
    initialMeloBleepsTokenURIAdmin: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },
    initialMeloBleepsRoyaltyAdmin: 1,
    initialMeloBleepsMinterAdmin: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },
    melobleepsGuardian: {
      default: 1,
      mainnet: initialAdmin,
      demo: demoAdmin,
      rinkeby: demoAdmin,
    },
  },
  networks: addForkConfiguration({
    hardhat: {
      // TODO
      blockGasLimit: 50000000,
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      deploy: devDeploy,
    },
    localhost: {
      url: node_url('localhost'),
      accounts: accounts(),
      deploy: devDeploy,
    },
    demo: {
      url: node_url('goerli'),
      accounts: accounts('goerli'),
    },
    mainnet: {
      url: node_url('mainnet'),
      accounts: accounts('mainnet'),
    },
    rinkeby: {
      url: node_url('rinkeby'),
      accounts: accounts('rinkeby'),
    },
  }),
  paths: {
    sources: 'src',
    deploy: productionDeploy,
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

  tenderly: {
    project: 'bleeps',
    username: process.env.TENDERLY_USERNAME as string,
  },
};

export default config;

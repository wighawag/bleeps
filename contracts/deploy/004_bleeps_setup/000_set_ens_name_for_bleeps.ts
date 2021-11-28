import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-explicit-any
// const namehash = require('eth-ens-namehash') as any;

const ReverseDefaultResolverABI = [
  {
    inputs: [{internalType: 'contract ENS', name: 'ensAddr', type: 'address'}],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    constant: true,
    inputs: [],
    name: 'ens',
    outputs: [{internalType: 'contract ENS', name: '', type: 'address'}],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{internalType: 'bytes32', name: '', type: 'bytes32'}],
    name: 'name',
    outputs: [{internalType: 'string', name: '', type: 'string'}],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      {internalType: 'bytes32', name: 'node', type: 'bytes32'},
      {internalType: 'string', name: '_name', type: 'string'},
    ],
    name: 'setName',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {execute, read, log} = deployments;

  const Bleeps = await deployments.get('Bleeps');
  const ENS = await deployments.getOrNull('ENS');

  if (ENS) {
    const newName = 'bleeps.eth';
    const bleepsOwner = await read('Bleeps', 'owner');
    const defaultResolver = await read('ReverseRegistrar', 'defaultResolver');
    const defaultResolverContract = await ethers.getContractAt(ReverseDefaultResolverABI, defaultResolver);
    const node = await read('ReverseRegistrar', 'node', Bleeps.address);
    const name = await defaultResolverContract.callStatic.name(node);
    if (name !== newName) {
      await execute('Bleeps', {from: bleepsOwner, log: true, autoMine: true}, 'setENSName', newName);
    } else {
      log(`name already set: ${newName}`);
    }
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy'];

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-explicit-any
const namehash = require('eth-ens-namehash') as any;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read, log} = deployments;

  const Bleeps = await deployments.get('Bleeps');

  const bleepsOwner = await read('Bleeps', 'owner');

  const ENS = await deployments.getOrNull('ENS');

  if (ENS) {
    // defaultResolver TODO
    // name
    const expectedNode = namehash.hash(`${Bleeps.address.toLowerCase().slice(2)}.addr.reverse`);
    const node = await read('ReverseRegistrar', 'node', Bleeps.address);
    if (expectedNode !== node) {
      await execute('Bleeps', {from: bleepsOwner, log: true, autoMine: true}, 'setENSName', 'bleeps.eth');
      const newNode = await read('ReverseRegistrar', 'node', Bleeps.address);
      log({ens_reverse_node: newNode});
    } else {
      log(`node already set: ${expectedNode}`);
    }
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy'];

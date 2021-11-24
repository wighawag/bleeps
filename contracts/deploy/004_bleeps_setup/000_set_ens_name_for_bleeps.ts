import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read, log} = deployments;

  const Bleeps = await deployments.get('Bleeps');

  const bleepsOwner = await read('Bleeps', 'owner');

  const ENS = await deployments.getOrNull('ENS');
  if (ENS) {
    await execute('Bleeps', {from: bleepsOwner, log: true, autoMine: true}, 'setENSName', 'bleeps.eth');
    const node = await read('ReverseRegistrar', 'node', Bleeps.address);
    log({ens_reverse_node: node});
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy'];

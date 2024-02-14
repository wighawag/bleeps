import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BleepsDAOGovernor} from '../../typechain';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {execute, log} = deployments;

  if (hre.network.name !== 'skip') {
    log('TODO : remove veto');
    return;
  }

  const BleepsDAOGovernor = <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor');

  // disable veto
  const currentVetoer = await BleepsDAOGovernor.callStatic.vetoer();
  if (currentVetoer !== AddressZero) {
    await execute('BleepsDAOGovernor', {from: currentVetoer, log: true, autoMine: true}, 'setVetoer', AddressZero);
  }
};
export default func;
func.tags = ['BleepsDAOGovernor'];
func.dependencies = ['BleepsDAOGovernor_deploy'];

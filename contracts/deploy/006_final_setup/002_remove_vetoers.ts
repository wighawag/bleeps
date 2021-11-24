import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BleepsDAOGovernor} from '../../typechain';
import {waitFor} from '../../utils';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {log} = deployments;
  const {daoVetoer} = await getNamedAccounts();

  function skip() {
    return true;
  }
  if (skip()) {
    log('TODO : remove veto');
    return;
  }

  const BleepsDAOGovernor = <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor');

  // disable veto
  if ((await BleepsDAOGovernor.callStatic.vetoer()) !== AddressZero) {
    const BleepsDAOGovernorAsVetoer = <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor', daoVetoer);
    await waitFor(BleepsDAOGovernorAsVetoer.setVetoer(AddressZero));
  }
};
export default func;
func.tags = ['BleepsDAOGovernor'];
func.dependencies = ['BleepsDAOGovernor_deploy'];

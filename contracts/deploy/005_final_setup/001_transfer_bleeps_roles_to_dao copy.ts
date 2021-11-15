import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {Bleeps} from '../../typechain';
import {waitFor} from '../../utils';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {log} = deployments;
  const {bleepsTokenURIAdmin, bleepsRoyaltyAdmin, bleepsMinterAdmin, bleepsGuardian, checkpointingDisabler} =
    await getNamedAccounts();

  function skip() {
    return true;
  }
  if (skip()) {
    log('TODO : move bleeps rights to DAO...');
    return;
  }

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  const Bleeps = await ethers.getContract('Bleeps');

  if ((await Bleeps.callStatic.tokenURIAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsTokenURIAdmin = <Bleeps>await ethers.getContract('Bleeps', bleepsTokenURIAdmin);
    await waitFor(BleepsAsTokenURIAdmin.setTokenURIAdmin(BleepsDAOAccount.address));
  }

  if ((await Bleeps.callStatic.royaltyAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsRoyaltyAdmin = <Bleeps>await ethers.getContract('Bleeps', bleepsRoyaltyAdmin);
    await waitFor(BleepsAsRoyaltyAdmin.setRoyaltyAdmin(BleepsDAOAccount.address));
  }

  if ((await Bleeps.callStatic.minterAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsMinterAdmin = <Bleeps>await ethers.getContract('Bleeps', bleepsMinterAdmin);
    await waitFor(BleepsAsMinterAdmin.setMinterAdmin(BleepsDAOAccount.address));
  }

  // disable guardian
  if ((await Bleeps.callStatic.guardian()) !== AddressZero) {
    const BleepsAsGuardian = <Bleeps>await ethers.getContract('Bleeps', bleepsGuardian);
    await waitFor(BleepsAsGuardian.setGuardian(AddressZero));
  }

  // disable checkpoint disabler
  if ((await Bleeps.callStatic.checkpointingDisabler()) !== AddressZero) {
    const BleepsAsCheckpointDisabler = <Bleeps>await ethers.getContract('Bleeps', checkpointingDisabler);
    await waitFor(BleepsAsCheckpointDisabler.setCheckpointingDisabler(AddressZero));
  }
};
export default func;
func.tags = ['BleepsDAOGovernor', 'BleepsDAOAccount', 'Bleeps'];
func.dependencies = ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy', 'Bleeps_deploy'];

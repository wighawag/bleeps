import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {MeloBleeps} from '../../typechain';
import {waitFor} from '../../utils';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {log} = deployments;
  const {bleepsTokenURIAdmin, bleepsRoyaltyAdmin, bleepsMinterAdmin, bleepsGuardian} = await getNamedAccounts();

  function skip() {
    return true;
  }
  if (skip()) {
    log('TODO : move melobleeps rights to DAO...');
    return;
  }

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  const MeloBleeps = <MeloBleeps>await ethers.getContract('MeloBleeps');

  if ((await MeloBleeps.callStatic.tokenURIAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsTokenURIAdmin = <MeloBleeps>await ethers.getContract('MeloBleeps', bleepsTokenURIAdmin);
    await waitFor(BleepsAsTokenURIAdmin.setTokenURIAdmin(BleepsDAOAccount.address));
  }

  if ((await MeloBleeps.callStatic.royaltyAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsRoyaltyAdmin = <MeloBleeps>await ethers.getContract('MeloBleeps', bleepsRoyaltyAdmin);
    await waitFor(BleepsAsRoyaltyAdmin.setRoyaltyAdmin(BleepsDAOAccount.address));
  }

  if ((await MeloBleeps.callStatic.minterAdmin()) !== BleepsDAOAccount.address) {
    const BleepsAsMinterAdmin = <MeloBleeps>await ethers.getContract('MeloBleeps', bleepsMinterAdmin);
    await waitFor(BleepsAsMinterAdmin.setMinterAdmin(BleepsDAOAccount.address));
  }

  // disable guardian
  if ((await MeloBleeps.callStatic.guardian()) !== AddressZero) {
    const BleepsAsGuardian = <MeloBleeps>await ethers.getContract('MeloBleeps', bleepsGuardian);
    await waitFor(BleepsAsGuardian.setGuardian(AddressZero));
  }
};
export default func;
func.tags = ['BleepsDAOGovernor', 'BleepsDAOAccount', 'MeloBleeps'];
func.dependencies = ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy', 'MeloBleeps_deploy'];

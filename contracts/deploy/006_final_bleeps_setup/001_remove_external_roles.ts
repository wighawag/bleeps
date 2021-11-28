import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {execute, log} = deployments;

  if (hre.network.name !== 'skip') {
    log('TODO : remove veto');
    return;
  }

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  const Bleeps = await ethers.getContract('Bleeps');

  const currentTokenURIAdmin = await Bleeps.callStatic.tokenURIAdmin();
  if (currentTokenURIAdmin !== BleepsDAOAccount.address) {
    await execute(
      'Bleeps',
      {from: currentTokenURIAdmin, log: true, autoMine: true},
      'setTokenURIAdmin',
      BleepsDAOAccount.address
    );
  }

  const currentRoyaltyAdmin = await Bleeps.callStatic.royaltyAdmin();
  if (currentRoyaltyAdmin !== BleepsDAOAccount.address) {
    await execute(
      'Bleeps',
      {from: currentRoyaltyAdmin, log: true, autoMine: true},
      'setRoyaltyAdmin',
      BleepsDAOAccount.address
    );
  }

  const currentMinterAdmin = await Bleeps.callStatic.minterAdmin();
  if (currentMinterAdmin !== BleepsDAOAccount.address) {
    await execute(
      'Bleeps',
      {from: currentMinterAdmin, log: true, autoMine: true},
      'setMinterAdmin',
      BleepsDAOAccount.address
    );
  }

  // disable guardian
  const currentGuardian = await Bleeps.callStatic.guardian();
  if (currentGuardian !== AddressZero) {
    await execute('Bleeps', {from: currentGuardian, log: true, autoMine: true}, 'setGuardian', AddressZero);
  }

  // disable checkpoint disabler
  const currrentCheckpointingDisabler = await Bleeps.callStatic.checkpointingDisabler();
  if (currrentCheckpointingDisabler !== AddressZero) {
    await execute(
      'Bleeps',
      {from: currrentCheckpointingDisabler, log: true, autoMine: true},
      'setCheckpointingDisabler',
      AddressZero
    );
  }
};
export default func;
func.tags = ['BleepsDAOGovernor', 'BleepsDAOAccount', 'Bleeps'];
func.dependencies = ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy', 'Bleeps_deploy'];

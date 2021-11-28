import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {execute} = deployments;

  const {initialBleepsMinterAdmin} = await getNamedAccounts();

  const Bleeps = await ethers.getContract('Bleeps');

  const currentAdmin = await Bleeps.callStatic.minterAdmin();
  if (currentAdmin.toLowerCase() !== initialBleepsMinterAdmin.toLowerCase()) {
    await execute(
      'Bleeps',
      {from: currentAdmin, log: true, autoMine: true},
      'setMinterAdmin',
      initialBleepsMinterAdmin
    );
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy', 'BleepsInitialSale'];

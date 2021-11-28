import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {execute} = deployments;

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  const Bleeps = await ethers.getContract('Bleeps');

  const currentOwner = await Bleeps.callStatic.owner();
  if (currentOwner.toLowerCase() !== BleepsDAOAccount.address.toLowerCase()) {
    await execute(
      'Bleeps',
      {from: currentOwner, log: true, autoMine: true},
      'transferOwnership',
      BleepsDAOAccount.address
    );
  }
};
export default func;
func.tags = ['BleepsDAOAccount', 'Bleeps', 'Bleeps_setup', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsDAOAccount_deploy', 'Bleeps_deploy'];

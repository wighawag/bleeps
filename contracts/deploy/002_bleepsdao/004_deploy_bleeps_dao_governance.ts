import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const bleeps = await deployments.get('Bleeps');

  // time Lock is the owner of the DAO
  const BleepsDAOExecutor = await deploy('BleepsDAOExecutor', {
    from: deployer,
    args: [deployer, 2 * 24 * 3600], // 2 * 24 * 3600 = timeLOckdelay
    log: true,
    autoMine: true,
  });

  const BleepsDAOGovernor = await deploy('BleepsDAOGovernor', {
    from: deployer,
    args: [bleeps.address, BleepsDAOExecutor.address],
    log: true,
    autoMine: true,
  });

  if (BleepsDAOGovernor.newlyDeployed) {
    await execute('BleepsDAOExecutor', {from: deployer, log: true}, 'setFirstAdmin', BleepsDAOGovernor.address);
  }
};
export default func;
func.tags = ['BleepsDAOGovernor'];

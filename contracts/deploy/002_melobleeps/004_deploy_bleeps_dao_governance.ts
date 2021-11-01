import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const bleeps = await deployments.get('Bleeps');

  // TODO TimeLock should be called the BleepsDAOGovernance
  const Timelock = await deploy('Timelock', {
    from: deployer,
    args: [deployer, 2], // 2 = timeLOckdelay
    log: true,
    autoMine: true,
  });

  const BleepsDAOGovernance = await deploy('BleepsDAOGovernance', {
    from: deployer,
    args: [bleeps.address, Timelock.address], // 2 = timeLOckdelay
    log: true,
    autoMine: true,
  });

  if (BleepsDAOGovernance.newlyDeployed) {
    await execute('Timelock', {from: deployer, log: true}, 'setFirstAdmin', BleepsDAOGovernance.address);
  }
};
export default func;
func.tags = ['BleepsDAOGovernance'];

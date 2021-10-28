import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const bleeps = await deployments.get('Bleeps');

  const Timelock = await deploy('Timelock', {
    from: deployer,
    args: [deployer, 2], // 2 = timeLOckdelay
    log: true,
    autoMine: true,
  });

  const BleepsDAO = await deploy('BleepsDAO', {
    from: deployer,
    args: [bleeps.address, Timelock.address], // 2 = timeLOckdelay
    log: true,
    autoMine: true,
  });

  if (BleepsDAO.newlyDeployed) {
    await execute('Timelock', {from: deployer, log: true}, 'setFirstAdmin', BleepsDAO.address);
  }
};
export default func;
func.tags = ['BleepsDAO'];

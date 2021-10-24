import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer, bleepsMaintainer, saleRecipient} = await getNamedAccounts();

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

  await execute('Timelock', {from: deployer}, 'setFirstAdmin', BleepsDAO.address);
};
export default func;
func.tags = ['BleepsDAO'];

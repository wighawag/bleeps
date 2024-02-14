import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, daoVetoer} = await getNamedAccounts();

  const Bleeps = await deployments.get('Bleeps');
  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  await deploy('BleepsDAOGovernor', {
    from: deployer,
    args: [Bleeps.address, BleepsDAOAccount.address, daoVetoer],
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['BleepsDAOGovernor', 'BleepsDAOGovernor_deploy'];
func.dependencies = ['BleepsDAOAccount_deploy'];

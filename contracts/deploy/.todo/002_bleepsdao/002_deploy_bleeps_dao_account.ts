import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import config from '../../config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, daoGuardian} = await getNamedAccounts();

  await deploy('BleepsDAOAccount', {
    from: deployer,
    args: [config.MIN_TIMELOCK_DELAY, daoGuardian],
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_deploy'];

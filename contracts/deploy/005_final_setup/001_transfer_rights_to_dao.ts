import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  // TODO
};
export default func;
func.tags = ['BleepsDAOGovernor', 'BleepsDAOAccount', 'Bleeps'];
func.dependencies = ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy', 'Bleeps_deploy'];

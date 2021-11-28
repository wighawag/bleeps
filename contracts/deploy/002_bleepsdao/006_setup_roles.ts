import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {deployer} = await getNamedAccounts();

  const BleepsDAOGovernor = await deployments.get('BleepsDAOGovernor');

  const PROPOSER_ROLE = await read('BleepsDAOAccount', 'PROPOSER_ROLE');
  const TIMELOCK_ADMIN_ROLE = await read('BleepsDAOAccount', 'TIMELOCK_ADMIN_ROLE');

  if (!(await read('BleepsDAOAccount', 'hasRole', PROPOSER_ROLE, BleepsDAOGovernor.address))) {
    await execute(
      'BleepsDAOAccount',
      {from: deployer, log: true, autoMine: true},
      'grantRole',
      PROPOSER_ROLE,
      BleepsDAOGovernor.address
    );
  }

  if (await read('BleepsDAOAccount', 'hasRole', TIMELOCK_ADMIN_ROLE, deployer)) {
    await execute(
      'BleepsDAOAccount',
      {from: deployer, log: true, autoMine: true},
      'revokeRole',
      TIMELOCK_ADMIN_ROLE,
      deployer
    );
  }
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOGovernor', 'BleepsDAOAccount_setup', 'BleepsDAOGovernor_setup'];
func.dependencies = ['BleepsDAOAccount_deploy', 'BleepsDAOGovernor_deploy'];

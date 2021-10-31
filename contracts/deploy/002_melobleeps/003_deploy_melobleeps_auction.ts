import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {deployer, melobleepsMinterAdmin} = await getNamedAccounts();

  const Bleeps = await deployments.get('Bleeps');
  const MeloBleeps = await deployments.get('MeloBleeps');
  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  const MeloBleepsAuction = await deploy('MeloBleepsAuction', {
    from: deployer,
    args: [Bleeps.address, MeloBleeps.address, BleepsDAOAccount.address],
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const currentMinter = await read('MeloBleeps', 'minter');
  if (currentMinter?.toLowerCase() !== MeloBleepsAuction.address) {
    await execute('MeloBleeps', {from: melobleepsMinterAdmin, log: true}, 'setMinter', MeloBleepsAuction.address);
  }
};
export default func;
func.tags = ['MeloBleepsAuction'];
func.dependencies = ['Bleeps', 'MeloBleeps', 'BleepsDAOAccount'];

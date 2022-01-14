import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {deployer, initialMeloBleepsMinterAdmin} = await getNamedAccounts();

  const Bleeps = await deployments.get('Bleeps');
  const MeloBleeps = await deployments.get('MeloBleeps');
  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  const WETH = await deployments.get('WETH');

  const MeloBleepsAuctions = await deploy('MeloBleepsAuctions', {
    from: deployer,
    args: [WETH.address, Bleeps.address, MeloBleeps.address, BleepsDAOAccount.address],
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const currentMinter = await read('MeloBleeps', 'minter');
  if (currentMinter?.toLowerCase() !== MeloBleepsAuctions.address.toLowerCase()) {
    await execute(
      'MeloBleeps',
      {from: initialMeloBleepsMinterAdmin, log: true, autoMine: true},
      'setMinter',
      MeloBleepsAuctions.address
    );
  }
};
export default func;
func.tags = ['MeloBleepsAuctions'];
func.dependencies = ['Bleeps_deploy', 'MeloBleeps_deploy', 'BleepsDAOAccount_deploy', 'WETH'];

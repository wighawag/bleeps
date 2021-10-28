import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {deployer, bleepsMaintainer, bleepsMinterAdmin} = await getNamedAccounts();

  const tokenURIContract = await deploy('BleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const existingBleeps = await deployments.getOrNull('Bleeps');

  let needUpdate = false;
  if (existingBleeps) {
    const currentTokenURIContract = await read('Bleeps', 'tokenURIContract');
    if (currentTokenURIContract?.toLowerCase() !== tokenURIContract.address.toLowerCase()) {
      needUpdate = true;
    }
  }

  if (needUpdate) {
    await execute('Bleeps', {from: bleepsMaintainer, log: true}, 'setTokenURIContract', tokenURIContract.address);
  } else {
    await deploy('Bleeps', {
      from: deployer,
      args: [bleepsMaintainer, bleepsMinterAdmin, tokenURIContract.address],
      skipIfAlreadyDeployed: true,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
  }
};
export default func;
func.tags = ['Bleeps'];

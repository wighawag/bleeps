import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer, bleepsMaintainer} = await getNamedAccounts();

  const tokenURIContract = await deploy('MeloBleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  if ((await deployments.getOrNull('MeloBleeps')) && tokenURIContract.newlyDeployed) {
    await execute('MeloBleeps', {from: bleepsMaintainer, log: true}, 'setTokenURIContract', tokenURIContract.address);
  } else {
    await deploy('MeloBleeps', {
      from: deployer,
      args: [bleepsMaintainer, tokenURIContract.address],
      log: true,
      skipIfAlreadyDeployed: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
  }

  // await deployments.save('MeloBleeps', {...deployment, linkedData: {bytecode: deployment.bytecode}});
};
export default func;
func.tags = ['MeloBleeps'];

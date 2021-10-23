import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, bleepsMaintainer} = await getNamedAccounts();

  const deployment = await deploy('Bleeps', {
    from: deployer,
    args: [bleepsMaintainer],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
  await deployments.save('Bleeps', {...deployment, linkedData: {bytecode: deployment.bytecode}});
};
export default func;
func.tags = ['Bleeps'];

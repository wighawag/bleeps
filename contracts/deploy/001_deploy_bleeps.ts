import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, bleepsMaintainer, saleRecipient} = await getNamedAccounts();

  const tokenURIContract = await deploy('BleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  /*
      address maintainer,
        address payable recipient,
        BleepsTokenURI tokenURIContract,
        uint256 initPrice,
        uint256 delay,
        uint256 lastPrice
  */
  await deploy('Bleeps', {
    from: deployer,
    args: [
      bleepsMaintainer,
      saleRecipient,
      tokenURIContract.address,
      parseEther('2'),
      2 * 24 * 3600,
      parseEther('0.05'),
    ],
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });
  // await deployments.save('MeloBleeps', {...deployment, linkedData: {bytecode: deployment.bytecode}});
};
export default func;
func.tags = ['Bleeps'];

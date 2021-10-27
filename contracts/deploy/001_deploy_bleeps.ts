import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer, bleepsMaintainer, saleRecipient} = await getNamedAccounts();

  const mandalasAddress = '0xDaCa87395f3b1Bbc46F3FA187e996E03a5dCc985';

  const tokenURIContract = await deploy('BleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  if ((await deployments.getOrNull('Bleeps')) && tokenURIContract.newlyDeployed) {
    await execute('Bleeps', {from: bleepsMaintainer, log: true}, 'setTokenURIContract', tokenURIContract.address);
  } else {
    await deploy('Bleeps', {
      from: deployer,
      // proxy: {
      //   execute: {
      //     init: {
      //       methodName: 'init',
      //       args: [bleepsMaintainer, saleRecipient, tokenURIContract.address], // modifiable
      //     },
      //   },
      // },
      args: [
        // immutables
        parseEther('2'),
        2 * 24 * 3600,
        parseEther('0.1'),
        Math.floor(Date.now() / 1000), // TODO double check
        mandalasAddress,
        bleepsMaintainer,
        saleRecipient,
        tokenURIContract.address,
      ],
      skipIfAlreadyDeployed: true,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
    // await deployments.save('MeloBleeps', {...deployment, linkedData: {bytecode: deployment.bytecode}});
  }
};
export default func;
func.tags = ['Bleeps'];

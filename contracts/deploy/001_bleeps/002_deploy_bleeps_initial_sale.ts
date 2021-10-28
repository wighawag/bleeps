import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {deployer, saleRecipient, bleepsMinterAdmin} = await getNamedAccounts();

  const MandalaToken = await deployments.get('MandalaToken');
  const Bleeps = await deployments.get('Bleeps');

  const BleepsInitialSale = await deploy('BleepsInitialSale', {
    from: deployer,
    args: [
      Bleeps.address,
      parseEther('2'),
      2 * 24 * 3600,
      parseEther('0.1'),
      Math.floor(Date.now() / 1000), // TODO double check
      saleRecipient,
      MandalaToken.address,
    ],
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  const currentMinter = await read('Bleeps', 'minter');
  if (currentMinter?.toLowerCase() !== BleepsInitialSale.address) {
    await execute('Bleeps', {from: bleepsMinterAdmin, log: true}, 'setMinter', BleepsInitialSale.address);
  }
};
export default func;
func.tags = ['BleepsInitialSale'];
func.dependencies = ['Bleeps', 'MandalaToken'];

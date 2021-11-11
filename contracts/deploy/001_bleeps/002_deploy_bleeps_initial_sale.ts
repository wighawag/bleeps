import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
import {MerkleTree} from '../../utils/merkletree';
import {hashLeaves, createLeaves} from '../../utils/merkletree/salepass';
import {Wallet} from 'ethers';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {deployer, saleRecipient, bleepsMinterAdmin} = await getNamedAccounts();

  const MandalaToken = await deployments.get('MandalaToken');
  const Bleeps = await deployments.get('Bleeps');

  // const BleepsInitialSale = await deploy('BleepsInitialSale', {
  //   contract: 'BleepsDutchAuction',
  //   from: deployer,
  //   args: [
  //     Bleeps.address,
  //     parseEther('2'),
  //     2 * 24 * 3600,
  //     parseEther('0.1'),
  //     Math.floor(Date.now() / 1000), // TODO double check
  //     saleRecipient,
  //     MandalaToken.address,
  //     20, // 20% discount
  //   ],
  //   skipIfAlreadyDeployed: true,
  //   log: true,
  //   autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  // });

  let privateKeys: string[] = [];
  try {
    const keysFromFileStr = fs.readFileSync('.privateKeys.tmp');
    const keys = JSON.parse(keysFromFileStr.toString());
    if (keys && keys.length > 0) {
      privateKeys = keys;
    }
  } catch (e) {}

  if (privateKeys.length === 0) {
    for (let i = 0; i < 512; i++) {
      privateKeys.push(Wallet.createRandom().privateKey);
    }
  }

  const days = 24 * 3600;

  const leaves = createLeaves(privateKeys);
  const tree = new MerkleTree(hashLeaves(leaves));
  const merkleRootHash = tree.getRoot().hash;

  fs.writeFileSync('.privateKeys.tmp', JSON.stringify(privateKeys));

  const BleepsInitialSale = await deploy('BleepsInitialSale', {
    contract: 'BleepsFixedPriceSale',
    from: deployer,
    args: [
      Bleeps.address,
      parseEther('0.2'), // normal price
      parseEther('0.18'), // whitelistPrice
      Math.floor(Date.now() / 1000) + 3 * days,
      merkleRootHash,
      saleRecipient,
      MandalaToken.address,
      20, // 20% discount
    ],
    linkedData:
      hre.network.name === 'hardhat'
        ? {
            privateKeys,
            leaves,
          }
        : {leaves},
    skipIfAlreadyDeployed: true,
    log: true,
    autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
  });

  fs.writeFileSync('.privateKeys', JSON.stringify(privateKeys));
  fs.unlinkSync('.privateKeys.tmp');

  const currentMinter = await read('Bleeps', 'minter');
  if (currentMinter?.toLowerCase() !== BleepsInitialSale.address.toLowerCase()) {
    await execute('Bleeps', {from: bleepsMinterAdmin, log: true}, 'setMinter', BleepsInitialSale.address);
  }
};
export default func;
func.tags = ['BleepsInitialSale'];
func.dependencies = ['Bleeps', 'MandalaToken'];

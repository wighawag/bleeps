import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
import {MerkleTree} from 'bleeps-common';
import {createLeavesFromMandalaOwners, createLeavesFromPrivateKeys, hashLeaves} from 'bleeps-common';
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

  let BleepsInitialSale = await deployments.getOrNull('BleepsInitialSale');

  if (!BleepsInitialSale) {
    let privateKeys: string[] = [];
    try {
      const keysFromFileStr = fs.readFileSync('.privateKeys.tmp');
      const keys = JSON.parse(keysFromFileStr.toString());
      if (keys && keys.length > 0) {
        privateKeys = keys;
      }
    } catch (e) {}

    const mandalaOwners = JSON.parse(fs.readFileSync('mandalaOwners.json').toString());

    const num = privateKeys.length + mandalaOwners.length;
    if (num < 512) {
      for (let i = num; i < 512; i++) {
        privateKeys.push(Wallet.createRandom().privateKey);
      }
    }

    const days = 24 * 3600;

    const privateKeysLeaves = createLeavesFromPrivateKeys(0, privateKeys);
    const mandalaLeaves = createLeavesFromMandalaOwners(privateKeysLeaves.length, mandalaOwners);
    const leaves = privateKeysLeaves.concat(mandalaLeaves);
    const tree = new MerkleTree(hashLeaves(leaves));
    const merkleRootHash = tree.getRoot().hash;

    const privateKeysFilepath = `.privateKeys.json`;
    const privateKeysTMPFilepath = privateKeysFilepath + '.tmp';
    const privateKeysJsonString = JSON.stringify(privateKeys);

    await deployments.saveDotFile(privateKeysTMPFilepath, privateKeysJsonString);
    BleepsInitialSale = await deploy('BleepsInitialSale', {
      contract: 'BleepsFixedPriceSale',
      from: deployer,
      args: [
        Bleeps.address,
        parseEther('0.1'), // normal price
        parseEther('0.1'), // whitelistPrice
        Math.floor(Date.now() / 1000) + 3 * days,
        merkleRootHash,
        saleRecipient,
        MandalaToken.address,
        0, // 0% 20, // 20% discount
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

    await deployments.saveDotFile(privateKeysFilepath, privateKeysJsonString);
    await deployments.deleteDotFile(privateKeysTMPFilepath);
  }

  const currentMinter = await read('Bleeps', 'minter');
  if (currentMinter?.toLowerCase() !== BleepsInitialSale.address.toLowerCase()) {
    await execute('Bleeps', {from: bleepsMinterAdmin, log: true}, 'setMinter', BleepsInitialSale.address);
  }
};
export default func;
func.tags = ['BleepsInitialSale'];
func.dependencies = ['Bleeps', 'MandalaToken'];

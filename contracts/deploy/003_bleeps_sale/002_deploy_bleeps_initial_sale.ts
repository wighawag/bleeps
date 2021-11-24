import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
import {MerkleTree} from 'bleeps-common';
import {createLeavesFromMandalaOwners, createLeavesFromPrivateKeys, hashLeaves} from 'bleeps-common';
import {Wallet} from 'ethers';
import fs from 'fs';
import {getUnnamedAccounts} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read, log} = deployments;

  const {deployer, saleRecipient, initialBleepsMinterAdmin} = await getNamedAccounts();

  const MandalaToken = await deployments.get('MandalaToken');
  const Bleeps = await deployments.get('Bleeps');
  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  if (hre.network.name === 'localhost') {
    await deployments.delete('BleepsInitialSale');
  }

  let BleepsInitialSale = await deployments.getOrNull('BleepsInitialSale');

  const privateKeysFilepath = `.privateKeys.json`;
  const privateKeysTMPFilepath = privateKeysFilepath + '.tmp';

  if (!BleepsInitialSale) {
    let privateKeys: string[] = [];
    try {
      const keysFromFileStr = await deployments.readDotFile(privateKeysTMPFilepath);
      const keys = JSON.parse(keysFromFileStr);
      if (keys && keys.length > 0) {
        privateKeys = keys;
      }
    } catch (e) {}

    const mandalaOwners = JSON.parse(fs.readFileSync('mandalaOwners.json').toString());

    if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
      const unnamedAcounts = await getUnnamedAccounts();
      for (let i = 0; i < 2; i++) {
        mandalaOwners.push({id: unnamedAcounts[i], numMandalas: 0}); // fake mandala owners
      }
    }

    const totalNumPassKeys = 1024;
    const num = privateKeys.length + mandalaOwners.length;
    log(`generating ${totalNumPassKeys - num} private keys...`);
    if (num < totalNumPassKeys) {
      for (let i = num; i < totalNumPassKeys; i++) {
        privateKeys.push(Wallet.createRandom().privateKey);
      }
    }

    const days = 24 * 3600;

    const privateKeysLeaves = createLeavesFromPrivateKeys(0, privateKeys);
    const mandalaLeaves = createLeavesFromMandalaOwners(privateKeysLeaves.length, mandalaOwners);
    const leaves = privateKeysLeaves.concat(mandalaLeaves);
    const tree = new MerkleTree(hashLeaves(leaves));
    const merkleRootHash = tree.getRoot().hash;

    const privateKeysJsonString = JSON.stringify(privateKeys);

    console.log({first: privateKeys[0]});

    await deployments.saveDotFile(privateKeysTMPFilepath, privateKeysJsonString);

    const publicSaleTimestamp = Math.floor(Date.now() / 1000) + 3 * days;
    const deploymentCost = parseEther('2'); // TODO revisit (cost dto deploy the set of contracts)
    const deploymentCostStr = deploymentCost.toString();
    const price = parseEther('0.1');
    const totalSales = price.mul(448);
    const percentageForCreator = deploymentCost.mul(10000).div(totalSales).add(2000);
    console.log({
      percentageForCreator: percentageForCreator.toNumber(),
      totalSales: totalSales.div('1000000000000000').toNumber() / 1000,
    });
    BleepsInitialSale = await deploy('BleepsInitialSale', {
      contract: 'BleepsFixedPriceSale',
      from: deployer,
      args: [
        Bleeps.address,
        price, // normal price
        price, // whitelistPrice
        publicSaleTimestamp,
        merkleRootHash,
        saleRecipient,
        percentageForCreator.toNumber(), // 20% (2000 / 10000)
        BleepsDAOAccount.address,
        2, // 3 first instrument are open
      ],
      linkedData:
        hre.network.name === 'hardhat'
          ? {
              numPrivatePasses: privateKeys.length,
              privateKeys,
              leaves,
              publicSaleTimestamp,
              deploymentCost: 0, //deploymentCostStr,#
              percentageForCreator: percentageForCreator.toNumber(),
              price: price.toString(),
            }
          : {
              numPrivatePasses: privateKeys.length,
              leaves,
              publicSaleTimestamp,
              deploymentCost: 0, //deploymentCostStr
              percentageForCreator: percentageForCreator.toNumber(),
              price: price.toString(),
            },
      skipIfAlreadyDeployed: true,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });

    await deployments.saveDotFile(privateKeysFilepath, privateKeysJsonString);
    await deployments.deleteDotFile(privateKeysTMPFilepath);
  }

  const currentMinter = await read('Bleeps', 'minter');
  if (currentMinter?.toLowerCase() !== BleepsInitialSale.address.toLowerCase()) {
    await execute(
      'Bleeps',
      {from: initialBleepsMinterAdmin, log: true, autoMine: true},
      'setMinter',
      BleepsInitialSale.address
    );
  }
};
export default func;
func.tags = ['BleepsInitialSale'];
func.dependencies = ['Bleeps_deploy', 'MandalaToken', 'BleepsDAOAccount_deploy'];

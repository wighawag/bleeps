import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers/lib/utils';
import {MerkleTree} from 'bleeps-common';
import {createLeavesFromMandalaOwners, createLeavesFromPrivateKeys, hashLeaves} from 'bleeps-common';
import {BigNumber, Wallet} from 'ethers';
import fs from 'fs';
import {getUnnamedAccounts} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read, log} = deployments;
  const networkName = deployments.getNetworkName();

  const {deployer, projectCreator} = await getNamedAccounts();

  const Bleeps = await deployments.get('Bleeps');
  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  let reuseOldPrivateKeys = true;
  if (networkName === 'localhost') {
    reuseOldPrivateKeys = false;
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
    } catch (e) {
      if (reuseOldPrivateKeys) {
        try {
          const keysFromFileStr = await deployments.readDotFile(privateKeysFilepath);
          const keys = JSON.parse(keysFromFileStr);
          if (keys && keys.length > 0) {
            privateKeys = keys;
          }
        } catch (e) {}
      }
    }

    const mandalaOwners = JSON.parse(fs.readFileSync('mandalaOwners.json').toString());

    if (networkName === 'localhost' || networkName === 'hardhat') {
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

    await deployments.saveDotFile(privateKeysTMPFilepath, privateKeysJsonString);

    let startTime = Math.floor(Date.now() / 1000) + 5 * 60; // 5 min from now
    if (networkName === 'hardhat') {
      startTime = Math.floor(Date.now() / 1000);
    } else if (networkName === 'mainnet') {
      startTime = 1638266400; // Tuesday November 30th 2021, 10AM UTC
      log(
        `mainnet startTime:  ${
          new Date(startTime * 1000).toLocaleString() + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')'
        }`
      );
    } else if (networkName == 'staging') {
      // startTime += Math.floor(0.5 * days);
    }
    let publicSaleTimestamp = startTime + 3 * days;
    if (networkName == 'staging') {
      publicSaleTimestamp = Math.floor(startTime + 0.5 * days);
    }
    const price = parseEther('0.1');
    const totalSales = price.mul(448);
    const percentageForCreator = BigNumber.from(2500); // 25%
    log({
      percentageForCreator: percentageForCreator.toNumber(),
      totalSales: totalSales.div('1000000000000000').toNumber() / 1000,
    });
    BleepsInitialSale = await deploy('BleepsInitialSale', {
      contract: 'BleepsFixedPriceSale',
      from: deployer,
      args: [
        Bleeps.address,
        price, // normal price
        startTime,
        price, // whitelistPrice
        publicSaleTimestamp,
        merkleRootHash,
        projectCreator,
        percentageForCreator.toNumber(),
        BleepsDAOAccount.address,
        8, // all instrument technically available (minus reserved)
      ],
      linkedData:
        networkName === 'hardhat'
          ? {
              numPrivatePasses: privateKeys.length,
              privateKeys,
              leaves,
              startTime,
              publicSaleTimestamp,
              percentageForCreator: percentageForCreator.toNumber(),
              price: price.toString(),
            }
          : {
              numPrivatePasses: privateKeys.length,
              leaves,
              startTime,
              publicSaleTimestamp,
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

  const currentMinterAdmin = await read('Bleeps', 'minterAdmin');
  const currentMinter = await read('Bleeps', 'minter');
  if (currentMinter?.toLowerCase() !== BleepsInitialSale.address.toLowerCase()) {
    await execute(
      'Bleeps',
      {from: currentMinterAdmin, log: true, autoMine: true},
      'setMinter',
      BleepsInitialSale.address
    );
  }
};
export default func;
func.tags = ['BleepsInitialSale'];
func.dependencies = ['Bleeps_deploy', 'MandalaToken', 'BleepsDAOAccount_deploy'];

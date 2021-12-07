import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log} = deployments;

  const networkNane = await deployments.getNetworkName();
  if (networkNane === 'hardhat') {
    log(`skip for hardhat netwotk`);
    return;
  }

  const {deployer, projectCreator} = await getNamedAccounts();

  const Bleeps = await ethers.getContract('Bleeps');

  async function ensureMinterIs(minter: string) {
    const currentAdmin = await Bleeps.callStatic.minterAdmin();
    const currentMinter = await Bleeps.callStatic.minter();
    if (currentMinter.toLowerCase() !== minter.toLowerCase()) {
      await execute('Bleeps', {from: currentAdmin, log: true, autoMine: true}, 'setMinter', minter);
    }
  }

  const bleepOwners: {id: string; bleeps: number[]}[] = JSON.parse(
    fs.readFileSync('bleepsOwners_at_13757382.json').toString()
  ); // TODO blockNumber

  // -----------------------------------------------------------------------
  // batches
  // -----------------------------------------------------------------------
  const numBatches = 5;
  const numPerBatch = Math.ceil(bleepOwners.length / numBatches);
  for (let i = 0; i < numBatches; i++) {
    const start = i * numPerBatch;
    const end = Math.min(i * numPerBatch + numPerBatch, bleepOwners.length);

    const batch = bleepOwners.slice(start, end);
    log({start, end, length: batch.length});

    const [firstBatchOwner] = await Bleeps.callStatic.owners([batch[0].bleeps[0]]);
    if (firstBatchOwner === AddressZero) {
      await ensureMinterIs(deployer);
      if (batch.length > 0) {
        const ids: number[] = [];
        const addresses: string[] = [];
        for (const owner of batch) {
          for (const bleep of owner.bleeps) {
            ids.push(bleep);
            addresses.push(owner.id);
          }
        }
        await execute('Bleeps', {from: deployer, log: true, autoMine: true}, 'multiMint', ids, addresses);
      }
    }
  }
  // -----------------------------------------------------------------------
  // creator batch
  // -----------------------------------------------------------------------
  const [creatorBatchOwner] = await Bleeps.callStatic.owners([448]);
  if (creatorBatchOwner === AddressZero) {
    await ensureMinterIs(deployer);
    const ids = Array.from(Array(128)).map((v, i) => i + 448);
    const addresses: string[] = [projectCreator];
    await execute('Bleeps', {from: deployer, log: true, autoMine: true}, 'multiMint', ids, addresses);
  }

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');
  await ensureMinterIs(BleepsDAOAccount.address);

  // // -----------------------------------------------------------------------
  // // 1 batch + creator batch
  // // -----------------------------------------------------------------------

  // const ids = Array.from(Array(448)).map((v, i) => i);

  // //(232 - 16) * 2 + 16
  // const addresses: string[] = [];
  // for (let i = 0; i < 232; i++) {
  //   const addr = Wallet.createRandom().address;
  //   addresses.push(addr);
  //   if (i >= 16) {
  //     addresses.push(addr);
  //   }
  // }
  // // for (let i = 0; i < 128; i++) {
  // //   addresses.push(projectCreator);
  // // }

  // await execute(
  //   'Bleeps',
  //   {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
  //   'multiMint',
  //   ids,
  //   addresses
  // );

  // // -----------------------------------------------------------------------
  // // multi mint with Mint struct
  // // -----------------------------------------------------------------------

  // const ids = Array.from(Array(448)).map((v, i) => i);
  // const mints: {to: string; ids: number[]}[] = [];
  // for (let i = 0; i < 232; i++) {
  //   const addr = Wallet.createRandom().address;
  //   const idToAdd: number[] = [];
  //   idToAdd.push(ids.shift() || 0);
  //   if (i >= 16) {
  //     idToAdd.push(ids.shift() || 0);
  //   }
  //   mints.push({to: addr, ids: idToAdd});
  // }
  // // for (let i = 0; i < 128; i++) {
  // //   addresses.push(projectCreator);
  // // }

  // await execute('Bleeps', {from: deployer, log: true, autoMine: true, gasLimit: '30000000'}, 'multiMint', mints);
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy', 'BleepsDAOAccount_deploy'];

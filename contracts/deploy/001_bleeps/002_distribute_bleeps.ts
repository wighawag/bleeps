import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;

  const {deployer, projectCreator} = await getNamedAccounts();

  const Bleeps = await ethers.getContract('Bleeps');

  const currentAdmin = await Bleeps.callStatic.minterAdmin();
  const currentMinter = await Bleeps.callStatic.minter();
  if (currentMinter.toLowerCase() !== deployer) {
    await execute('Bleeps', {from: currentAdmin, log: true, autoMine: true}, 'setMinter', deployer);
  }

  const bleepOwners: {id: string; bleeps: number[]}[] = JSON.parse(
    fs.readFileSync('bleepsOwners_at_13746892.json').toString()
  ); // TODO blockNumber

  // -----------------------------------------------------------------------
  // batches
  // -----------------------------------------------------------------------
  const numBatches = 2;
  const numPerBatch = Math.ceil(bleepOwners.length / numBatches);
  for (let i = 0; i < numBatches; i++) {
    const start = i * numPerBatch;
    const end = Math.min(i * numPerBatch + numPerBatch, bleepOwners.length);

    const batch = bleepOwners.slice(start, end);
    console.log({start, end, length: batch.length});

    const [firstBatchOwner] = await Bleeps.callStatic.owners([batch[0].bleeps[0]]);
    if (firstBatchOwner === AddressZero) {
      if (batch.length > 0) {
        const ids: number[] = [];
        const addresses: string[] = [];
        for (const owner of batch) {
          for (const bleep of owner.bleeps) {
            ids.push(bleep);
            addresses.push(owner.id);
          }
        }
        await execute(
          'Bleeps',
          {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
          'multiMint',
          ids,
          addresses
        );
      }
    }
  }
  // -----------------------------------------------------------------------
  // creator batch
  // -----------------------------------------------------------------------
  const [batchOwner3] = await Bleeps.callStatic.owners([448]);
  if (batchOwner3 === AddressZero) {
    const ids3 = Array.from(Array(128)).map((v, i) => i + 448);
    const addresses3: string[] = [projectCreator];
    await execute(
      'Bleeps',
      {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
      'multiMint',
      ids3,
      addresses3
    );
  }

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
func.tags = ['Bleeps', 'Bleeps_deploy'];

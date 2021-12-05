import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {Wallet} from 'ethers';

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

  // -----------------------------------------------------------------------
  // batch 1
  // -----------------------------------------------------------------------
  const ids1 = Array.from(Array(216)).map((v, i) => i);
  const addresses1: string[] = [];
  for (let i = 0; i < 116; i++) {
    const addr = Wallet.createRandom().address;
    addresses1.push(addr);
    if (i >= 16) {
      addresses1.push(addr);
    }
  }
  await execute(
    'Bleeps',
    {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
    'multiMint',
    ids1,
    addresses1
  );

  // -----------------------------------------------------------------------
  // batch 2
  // -----------------------------------------------------------------------
  const ids2 = Array.from(Array(232)).map((v, i) => i + 216);
  const addresses2: string[] = [];
  for (let i = 0; i < 116; i++) {
    const addr = Wallet.createRandom().address;
    addresses2.push(addr);
    addresses2.push(addr);
  }
  await execute(
    'Bleeps',
    {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
    'multiMint',
    ids2,
    addresses2
  );

  // -----------------------------------------------------------------------
  // batch 3 (creator)
  // -----------------------------------------------------------------------
  const ids3 = Array.from(Array(128)).map((v, i) => i + 448);
  const addresses3: string[] = [projectCreator];
  console.log({ids3, addresses3});
  await execute(
    'Bleeps',
    {from: deployer, log: true, autoMine: true, gasLimit: '30000000'},
    'multiMint',
    ids3,
    addresses3
  );

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

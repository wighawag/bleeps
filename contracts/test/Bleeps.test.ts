import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, BleepsInitialSale} from '../typechain';
import {setupUsers} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
const {AddressZero} = constants;
// import Sound from 'node-aplay';
// import fs from 'fs';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('Bleeps');
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <BleepsInitialSale>await ethers.getContract('BleepsInitialSale'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});
describe('Bleeps', function () {
  it('tokenURI works', async function () {
    const {users, Bleeps} = await setup();
    const note = 3;
    const instr = 6;
    const tokenID = note + instr * 64;
    // await expect(users[0].Bleeps.mint(tokenID, users[0].address, {value: parseEther('3')}))
    //   .to.emit(Bleeps, 'Transfer')
    //   .withArgs(AddressZero, users[0].address, tokenID);
    const tokenURI = await Bleeps.tokenURI(tokenID);
    const metadataStr = tokenURI.substr('data:application/json,'.length);
    console.log(tokenURI);
    // const metadata = JSON.parse(metadataStr);
    // console.log(metadata);
    // console.log(`gas ${(await Bleeps.estimateGas.tokenURI(tokenID)).toNumber().toLocaleString('en')}`);
  });

  it('minting works', async function () {
    const {users, Bleeps, BleepsInitialSale} = await setup();
    const note = 3;
    const instr = 5;
    const tokenID = note + instr * 64;

    await expect(users[0].BleepsInitialSale.mint(tokenID, users[0].address, {value: parseEther('2')}))
      .to.emit(Bleeps, 'Transfer')
      .withArgs(AddressZero, users[0].address, tokenID);

    // after getting a mandala
    // console.log('first work');
    // await expect(users[0].Bleeps.mint(tokenID + 1, users[0].address, {value: parseEther('1.9')}))
    //   .to.emit(Bleeps, 'Transfer')
    //   .withArgs(AddressZero, users[0].address, tokenID + 1);
  });
});

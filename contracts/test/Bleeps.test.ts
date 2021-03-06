import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, IBleepsSale, OpenSeaProxyRegistryMock} from '../typechain';
import {setupUsers} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {mintViaMinterAdmin} from './utils/bleepsfixedsale';
const {AddressZero} = constants;
// import Sound from 'node-aplay';
// import fs from 'fs';

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['Bleeps']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    WyvernProxyRegistry: <OpenSeaProxyRegistryMock>await ethers.getContract('WyvernProxyRegistry'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});
describe('Bleeps', function () {
  it('supportsInterface', async function () {
    const {Bleeps} = await setup();
    expect(await Bleeps.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await Bleeps.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await Bleeps.supportsInterface('0x5b5e139f')).to.be.true;
    expect(await Bleeps.supportsInterface('0x2a55205a')).to.be.true;
    expect(await Bleeps.supportsInterface('0x00000000')).to.be.false;
    expect(await Bleeps.supportsInterface('0x11111111')).to.be.false;
  });

  it('opensea proxy works', async function () {
    const {users, Bleeps} = await setup();
    await mintViaMinterAdmin(1, users[0].address, users[0].address);
    await users[0].WyvernProxyRegistry.setProxy(users[1].address);
    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1);
    const owner = await Bleeps.ownerOf(1);
    expect(owner).to.be.equal(users[2].address);
  });

  it('opensea proxy works: fails when not set', async function () {
    const {users, Bleeps} = await setup();
    await mintViaMinterAdmin(1, users[0].address, users[0].address);
    // await users[0].WyvernProxyRegistry.setProxy(users[1].address);
    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1)).to.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );
  });

  it('tokenURI works', async function () {
    const {users, Bleeps} = await setup();
    const note = 3;
    const instr = 2;
    const tokenID = note + instr * 64;
    // await expect(users[0].Bleeps.mint(tokenID, users[0].address, {value: parseEther('3')}))
    //   .to.emit(Bleeps, 'Transfer')
    //   .withArgs(AddressZero, users[0].address, tokenID);
    const tokenURI = await Bleeps.tokenURI(tokenID);
    // const metadataStr = tokenURI.substr('data:application/json,'.length);
    console.log(tokenURI);
    // const metadata = JSON.parse(metadataStr);
    // console.log(metadata);
    console.log(`gas ${(await Bleeps.estimateGas.tokenURI(tokenID)).toNumber().toLocaleString('en')}`);
  });

  it('Bleeps contractURI works', async function () {
    const {Bleeps} = await setup();
    const contractURI = await Bleeps.contractURI();
    console.log(contractURI);
  });

  it('minting works', async function () {
    const {users, Bleeps} = await setup();
    const note = 3;
    const instr = 2;
    const tokenID = note + instr * 64;

    await expect(mintViaMinterAdmin(tokenID, users[0].address, users[0].address))
      .to.emit(Bleeps, 'Transfer')
      .withArgs(AddressZero, users[0].address, tokenID);

    // after getting a mandala
    // console.log('first work');
    // await expect(users[0].Bleeps.mint(tokenID + 1, users[0].address, {value: parseEther('1.9')}))
    //   .to.emit(Bleeps, 'Transfer')
    //   .withArgs(AddressZero, users[0].address, tokenID + 1);
  });
});

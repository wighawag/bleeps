import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {MeloBleeps} from '../typechain';
import {setupUsers} from './utils';
import {BigNumber, constants} from 'ethers';
import {solidityKeccak256} from 'ethers/lib/utils';
const {AddressZero} = constants;
// import Sound from 'node-aplay';
// import fs from 'fs';

function encodeNote(bn: BigNumber, step: {note: number; vol: number; index: number; shape: number}): BigNumber {
  const shift = BigNumber.from(2).pow(240 - step.index * 16);
  const value = step.note + step.shape * 64 + step.vol * 64 * 16;
  const extra = shift.mul(value);
  return bn.add(extra);
}

function createData(steps: {note: number; shape: number; vol: number}[]): {
  data1: string;
  data2: string;
} {
  const data1 =
    '0x' +
    steps
      .slice(0, 16)
      .reduce(
        (prev, curr, index) => encodeNote(prev, {note: curr.note, index, vol: curr.vol, shape: curr.shape}),
        BigNumber.from(0)
      )
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  const data2 =
    '0x' +
    steps
      .slice(16)
      .reduce(
        (prev, curr, index) => encodeNote(prev, {note: curr.note, index, vol: curr.vol, shape: curr.shape}),
        BigNumber.from(0)
      )
      .toHexString()
      .slice(2)
      .padStart(64, '0');
  return {data1, data2};
}

const setup = deployments.createFixture(async () => {
  await deployments.fixture('MeloBleeps');
  const contracts = {
    MeloBleeps: <MeloBleeps>await ethers.getContract('MeloBleeps'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});
describe('MeloBleeps tokenURI', function () {
  it('minting works', async function () {
    const {users, MeloBleeps} = await setup();
    // TODO :
    // let tokenID = BigNumber.from(0);
    // for (let i = 0; i < 16; i++) {
    //   tokenID = tokenID.add(BigNumber.from(i * 2 ** (3 + 3 + 3)).mul(BigNumber.from(2).pow(i * (6 + 3 + 3 + 3))));
    // }
    // const tokenID = '0x00020406080a0c0e10121416181a1c1e'; //'0x0000000000000000000000000001010101010101010101010101010101010101';
    // const data1 = '0x17042e105c30b8817142e305c70b9017242e505cb0b9817342e705cf0ba00000';
    // const data2 = '0x17442e905d30ba817542eb05d70bb017642ed05db0bb817742ef05df0bc00000';

    const testShape = 6;
    const testSong1 = [
      {vol: 5, note: 1, shape: testShape},
      {vol: 5, note: 3, shape: testShape},
      {vol: 5, note: 5, shape: testShape},
      {vol: 5, note: 7, shape: testShape},
      {vol: 5, note: 9, shape: testShape},
      {vol: 5, note: 11, shape: testShape},
      {vol: 5, note: 13, shape: testShape},
      {vol: 5, note: 15, shape: testShape},
      {vol: 5, note: 17, shape: testShape},
      {vol: 5, note: 19, shape: testShape},
      {vol: 5, note: 21, shape: testShape},
      {vol: 5, note: 23, shape: testShape},
      {vol: 5, note: 25, shape: testShape},
      {vol: 5, note: 27, shape: testShape},
      {vol: 5, note: 29, shape: testShape},
      {vol: 5, note: 31, shape: testShape},
      {vol: 5, note: 33, shape: testShape},
      {vol: 5, note: 35, shape: testShape},
      {vol: 5, note: 37, shape: testShape},
      {vol: 5, note: 39, shape: testShape},
      {vol: 5, note: 41, shape: testShape},
      {vol: 5, note: 43, shape: testShape},
      {vol: 5, note: 45, shape: testShape},
      {vol: 5, note: 47, shape: testShape},
      {vol: 5, note: 49, shape: testShape},
      {vol: 5, note: 51, shape: testShape},
      {vol: 5, note: 53, shape: testShape},
      {vol: 5, note: 55, shape: testShape},
      {vol: 5, note: 57, shape: testShape},
      {vol: 5, note: 59, shape: testShape},
      {vol: 5, note: 61, shape: testShape},
      {vol: 5, note: 63, shape: testShape},
    ];

    const testSong2 = [
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 26, shape: 6},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 26, shape: 6},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 26, shape: 6},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 26, shape: 6},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 7},
      {vol: 5, note: 26, shape: 6},
    ];

    const testSong3 = [
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 63, shape: 6},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 63, shape: 6},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 63, shape: 6},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 0, note: 0, shape: 0},
      {vol: 5, note: 63, shape: 6},
      {vol: 0, note: 0, shape: 0},
      {vol: 7, note: 1, shape: 8},
      {vol: 5, note: 63, shape: 6},
    ];

    const {data1, data2} = createData(testSong3);

    const tokenID = solidityKeccak256(['bytes32', 'bytes32'], [data1, data2]);

    await expect(users[0].MeloBleeps.mint(data1, data2, users[0].address))
      .to.emit(MeloBleeps, 'Transfer')
      .withArgs(AddressZero, users[0].address, tokenID);
    const tokenURI = await MeloBleeps.tokenURI(tokenID);
    // console.log(tokenURI);
    const metadataStr = tokenURI.substr('data:application/json,'.length);
    // console.log(metadataStr);
    const metadata = JSON.parse(metadataStr);
    // console.log(JSON.stringify(metadata, null, '  '));
    console.log(metadata.animation_url);
    // console.log(`gas ${(await MeloBleeps.estimateGas.tokenURI(tokenID)).toNumber().toLocaleString('en')}`);
    // const data = new Buffer(metadata.animation_url, 'base64');
    // write buffer to file
    // fs.writeFileSync('tmp.wav', data);

    // const music = new Sound('tmp.wav');
    // music.play();
  });
});

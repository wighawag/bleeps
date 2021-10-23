import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {MeloBleeps} from '../typechain';
import {setupUsers} from './utils';
import {BigNumber, constants} from 'ethers';
import {solidityKeccak256} from 'ethers/lib/utils';
const {AddressZero} = constants;
// import Sound from 'node-aplay';
// import fs from 'fs';

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
describe('MeloBleeps', function () {
  it('minting works', async function () {
    const {users, MeloBleeps} = await setup();
    // TODO :
    // let tokenID = BigNumber.from(0);
    // for (let i = 0; i < 16; i++) {
    //   tokenID = tokenID.add(BigNumber.from(i * 2 ** (3 + 3 + 3)).mul(BigNumber.from(2).pow(i * (6 + 3 + 3 + 3))));
    // }
    // const tokenID = '0x00020406080a0c0e10121416181a1c1e'; //'0x0000000000000000000000000001010101010101010101010101010101010101';
    const data1 = '0x17042e105c30b8817142e305c70b9017242e505cb0b9817342e705cf0ba00000';
    const data2 = '0x17442e905d30ba817542eb05d70bb017642ed05db0bb817742ef05df0bc00000';

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

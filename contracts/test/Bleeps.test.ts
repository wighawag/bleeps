import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps} from '../typechain';
import {setupUsers} from './utils';
import {BigNumber, constants} from 'ethers';
import {solidityKeccak256} from 'ethers/lib/utils';
const {AddressZero} = constants;
// import Sound from 'node-aplay';
// import fs from 'fs';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('Bleeps');
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});
describe('Bleeps', function () {
  it('minting works', async function () {
    const {users, Bleeps} = await setup();
    // TODO :
    // let tokenID = BigNumber.from(0);
    // for (let i = 0; i < 16; i++) {
    //   tokenID = tokenID.add(BigNumber.from(i * 2 ** (3 + 3 + 3)).mul(BigNumber.from(2).pow(i * (6 + 3 + 3 + 3))));
    // }
    // const tokenID = '0x00020406080a0c0e10121416181a1c1e'; //'0x0000000000000000000000000001010101010101010101010101010101010101';
    const data1 = '0x00080040018008002800c003801000480140058018006801c007802000000000';
    const data2 = '0x0088024009802800a802c00b803000c803400d803800e803c00f804000000000';

    const tokenID = solidityKeccak256(['bytes32', 'bytes32'], [data1, data2]);

    await expect(users[0].Bleeps.mint(data1, data2, users[0].address))
      .to.emit(Bleeps, 'Transfer')
      .withArgs(AddressZero, users[0].address, tokenID);
    const tokenURI = await Bleeps.tokenURI(tokenID);
    // console.log(tokenURI);
    const metadataStr = tokenURI.substr('data:application/json,'.length);
    // console.log(metadataStr);
    const metadata = JSON.parse(metadataStr);
    // console.log(JSON.stringify(metadata, null, '  '));
    console.log(metadata.animation_url);
    console.log(`gas ${(await Bleeps.estimateGas.tokenURI(tokenID)).toNumber().toLocaleString('en')}`);
    // const data = new Buffer(metadata.animation_url, 'base64');
    // write buffer to file
    // fs.writeFileSync('tmp.wav', data);

    // const music = new Sound('tmp.wav');
    // music.play();
  });
});

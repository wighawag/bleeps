import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, IBleepsSale} from '../typechain';
import {setupUsers, waitFor} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {PermitSignerFactory, PermitForAllSignerFactory} from './utils/eip712';
import {splitSignature} from '@ethersproject/bytes';
import {mintViaSalePass} from './utils/bleepsfixedsale';
const {AddressZero} = constants;

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['Bleeps', 'BleepsInitialSale']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <IBleepsSale>await ethers.getContract('BleepsInitialSale'),
  };
  const BleepsPermitSigner = PermitSignerFactory.createSigner({
    verifyingContract: contracts.Bleeps.address,
  });

  const BleepsPermitForAllSigner = PermitForAllSignerFactory.createSigner({
    verifyingContract: contracts.Bleeps.address,
  });

  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
    BleepsPermitSigner,
    BleepsPermitForAllSigner,
  };
});
describe('Bleeps Permit', function () {
  it('permit works', async function () {
    const {users, BleepsPermitSigner, Bleeps} = await setup();

    const tokenId = 1;
    await mintViaSalePass(tokenId, users[0].address, users[0].address);
    await mintViaSalePass(2, users[0].address, users[0].address);
    await mintViaSalePass(3, users[0].address, users[0].address);
    await mintViaSalePass(4, users[0].address, users[0].address);
    await mintViaSalePass(5, users[0].address, users[0].address);
    await mintViaSalePass(6, users[0].address, users[2].address);

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = await Bleeps.callStatic.tokenNonces(tokenId);
    const deadline = 4000000000;

    const signature = await BleepsPermitSigner.sign(users[0], {
      spender,
      tokenId,
      nonce,
      deadline,
    });

    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, tokenId)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[1].Bleeps.permit(spender, tokenId, deadline, signature);

    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, 2)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, tokenId);
    await expect(users[1].Bleeps.transferFrom(users[2].address, users[3].address, tokenId)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    const signature2 = await BleepsPermitSigner.sign(users[2], {
      spender: users[4].address,
      tokenId,
      nonce: await Bleeps.tokenNonces(tokenId),
      deadline,
    });

    await expect(users[4].Bleeps.transferFrom(users[2].address, users[5].address, tokenId)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await expect(users[4].Bleeps.permit(users[4].address, tokenId, deadline, signature)).to.be.revertedWith(
      'INVALID_SIGNATURE'
    );
    await users[4].Bleeps.permit(users[4].address, tokenId, deadline, signature2);

    await expect(users[4].Bleeps.transferFrom(users[2].address, users[5].address, 6)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[4].Bleeps.transferFrom(users[2].address, users[5].address, tokenId);
    await expect(users[4].Bleeps.transferFrom(users[5].address, users[6].address, tokenId)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );
  });

  it('permitForAll works', async function () {
    const {users, BleepsPermitForAllSigner, Bleeps} = await setup();

    await mintViaSalePass(1, users[0].address, users[0].address);
    await mintViaSalePass(2, users[0].address, users[0].address);
    await mintViaSalePass(3, users[0].address, users[0].address);
    await mintViaSalePass(4, users[0].address, users[0].address);
    await mintViaSalePass(5, users[0].address, users[0].address);
    await mintViaSalePass(6, users[0].address, users[0].address);

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = await Bleeps.accountNonces(signer);
    const deadline = 4000000000;

    const signature = await BleepsPermitForAllSigner.sign(users[0], {
      spender,
      nonce,
      deadline,
    });

    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[1].Bleeps.permitForAll(signer, spender, deadline, signature);

    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1);
    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, 2);

    const signature2 = await BleepsPermitForAllSigner.sign(users[0], {
      spender: users[4].address,
      nonce: nonce.add(1),
      deadline,
    });

    await expect(users[4].Bleeps.transferFrom(users[0].address, users[5].address, 5)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await expect(users[4].Bleeps.permitForAll(signer, users[4].address, deadline, signature)).to.be.revertedWith(
      'INVALID_SIGNATURE'
    );
    await users[4].Bleeps.permitForAll(signer, users[4].address, deadline, signature2);

    await users[4].Bleeps.transferFrom(users[0].address, users[5].address, 5);
    await users[4].Bleeps.transferFrom(users[0].address, users[5].address, 6);
  });
});

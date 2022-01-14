import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, IBleepsSale} from '../typechain';
import {setupUsers, waitFor} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {PermitSignerFactory, PermitForAllSignerFactory} from './utils/eip712';
import {splitSignature} from '@ethersproject/bytes';
import {mintViaMinterAdmin} from './utils/bleepsfixedsale';
const {AddressZero} = constants;

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['Bleeps']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
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
    await mintViaMinterAdmin(tokenId, users[0].address, users[0].address);
    await mintViaMinterAdmin(2, users[0].address, users[0].address);
    await mintViaMinterAdmin(3, users[0].address, users[0].address);
    await mintViaMinterAdmin(4, users[0].address, users[0].address);
    await mintViaMinterAdmin(5, users[0].address, users[0].address);
    await mintViaMinterAdmin(6, users[0].address, users[2].address);

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = await Bleeps.callStatic['nonces(uint256)'](tokenId);
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
      nonce: await Bleeps['nonces(uint256)'](tokenId),
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

    await mintViaMinterAdmin(1, users[0].address, users[0].address);
    await mintViaMinterAdmin(2, users[0].address, users[0].address);
    await mintViaMinterAdmin(3, users[0].address, users[0].address);
    await mintViaMinterAdmin(4, users[0].address, users[0].address);
    await mintViaMinterAdmin(5, users[0].address, users[0].address);
    await mintViaMinterAdmin(6, users[0].address, users[0].address);

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = await Bleeps['nonces(address)'](signer);
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

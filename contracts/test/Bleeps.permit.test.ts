import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, BleepsInitialSale} from '../typechain';
import {setupUsers, waitFor} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {PermitSignerFactory, PermitForAllSignerFactory} from './utils/eip712';
import {splitSignature} from '@ethersproject/bytes';
const {AddressZero} = constants;

const setup = deployments.createFixture(async () => {
  await deployments.fixture('Bleeps');
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <BleepsInitialSale>await ethers.getContract('BleepsInitialSale'),
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
    const {users, BleepsPermitSigner} = await setup();

    const tokenId = 1;
    await waitFor(users[0].BleepsInitialSale.mint(tokenId, users[0].address, {value: parseEther('2')}));
    await waitFor(users[0].BleepsInitialSale.mint(2, users[0].address, {value: parseEther('2')}));
    await waitFor(users[0].BleepsInitialSale.mint(3, users[0].address, {value: parseEther('2')}));

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = 0;
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

    await users[1].Bleeps.permit(signer, spender, tokenId, deadline, nonce, signature, 0);

    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, 2)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, tokenId);
    await expect(users[1].Bleeps.transferFrom(users[2].address, users[3].address, tokenId)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );
  });

  it('permitForAll works', async function () {
    const {users, BleepsPermitForAllSigner} = await setup();

    await waitFor(users[0].BleepsInitialSale.mint(1, users[0].address, {value: parseEther('2')}));
    await waitFor(users[0].BleepsInitialSale.mint(2, users[0].address, {value: parseEther('2')}));
    await waitFor(users[0].BleepsInitialSale.mint(3, users[0].address, {value: parseEther('2')}));

    const signer = users[0].address;
    const spender = users[1].address;
    const nonce = 0;
    const deadline = 4000000000;

    const signature = await BleepsPermitForAllSigner.sign(users[0], {
      spender,
      nonce,
      deadline,
    });

    await expect(users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1)).to.be.revertedWith(
      'UNAUTHORIZED_TRANSFER'
    );

    await users[1].Bleeps.permitForAll(signer, spender, deadline, nonce, signature, 0);

    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, 1);
    await users[1].Bleeps.transferFrom(users[0].address, users[2].address, 2);
  });
});

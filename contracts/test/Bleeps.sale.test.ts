import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, BleepsFixedPriceSale} from '../typechain';
import {setupUsers, waitFor} from './utils';
import {parseEther, SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {Wallet} from 'ethers';
import {joinSignature} from '@ethersproject/bytes';
import {MerkleTree} from 'bleeps-common';
import {calculateHash, hashLeaves} from 'bleeps-common';

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['Bleeps', 'BleepsInitialSale']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <BleepsFixedPriceSale>await ethers.getContract('BleepsInitialSale'),
  };

  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});
describe('BleepsFixedPriceSale', function () {
  it('mint', async function () {
    const {users} = await setup();

    const {linkedData} = await deployments.get('BleepsInitialSale');
    const leaves = linkedData.leaves;
    const tree = new MerkleTree(hashLeaves(leaves));

    const index = 7;

    const signingKey = new SigningKey(linkedData.privateKeys[index]);
    const passId = '' + index;
    const signature = signingKey.signDigest(solidityKeccak256(['uint256', 'address'], [passId, users[0].address]));
    const proof = tree.getProof(calculateHash(passId, new Wallet(signingKey.privateKey).address));
    // proof[0] = proof[0].slice(0, 64) + 'FF'; // make it invalid

    await waitFor(
      users[0].BleepsInitialSale.mintWithSalePass(1, users[0].address, passId, joinSignature(signature), proof, {
        value: parseEther('0.2'),
      })
    );
  });
});

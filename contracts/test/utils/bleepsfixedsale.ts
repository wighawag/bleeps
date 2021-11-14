import {deployments, ethers} from 'hardhat';
import {parseEther, SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {MerkleTree} from 'bleeps-common';
import {calculateHash, hashLeaves} from 'bleeps-common';
import {ContractTransaction, Wallet} from 'ethers';
import {joinSignature} from '@ethersproject/bytes';
import {BleepsFixedPriceSale} from '../../typechain/BleepsFixedPriceSale';

let counter = 0;
export async function mintViaSalePass(tokenId: number, from: string, to: string): Promise<ContractTransaction> {
  const {linkedData} = await deployments.get('BleepsInitialSale');
  const leaves = linkedData.leaves;
  const tree = new MerkleTree(hashLeaves(leaves));

  const index = counter++;
  const signingKey = new SigningKey(linkedData.privateKeys[index]);
  const passId = '' + index;
  const signature = signingKey.signDigest(solidityKeccak256(['uint256', 'address'], [passId, to]));
  const proof = tree.getProof(calculateHash(passId, new Wallet(signingKey.privateKey).address));
  // proof[0] = proof[0].slice(0, 64) + 'FF'; // make it invalid

  const BleepsInitialSale = <BleepsFixedPriceSale>await ethers.getContract('BleepsInitialSale', from);
  const tx = await BleepsInitialSale.mintWithSalePass(tokenId, to, passId, joinSignature(signature), proof, {
    value: parseEther('0.2'),
  });
  await tx.wait();
  return tx;
}

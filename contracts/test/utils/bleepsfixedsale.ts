import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {parseEther, SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {MerkleTree} from 'bleeps-common';
import {calculateHash, hashLeaves} from 'bleeps-common';
import {ContractTransaction, Wallet} from 'ethers';
import {joinSignature} from '@ethersproject/bytes';
import {BleepsFixedPriceSale} from '../../typechain/BleepsFixedPriceSale';
import {AddressZero} from '@ethersproject/constants';
import {Bleeps} from '../../typechain';
const {execute, read, log} = deployments;

let counter = 0;

// export async function mintViaSalePass(tokenId: number, from: string, to: string): Promise<ContractTransaction> {
//   const {linkedData} = await deployments.get('BleepsInitialSale');
//   const leaves = linkedData.leaves;
//   const tree = new MerkleTree(hashLeaves(leaves));

//   const index = counter++;
//   const signingKey = new SigningKey(linkedData.privateKeys[index]);
//   const passId = '' + index;
//   const signature = signingKey.signDigest(solidityKeccak256(['uint256', 'address'], [passId, to]));
//   const proof = tree.getProof(calculateHash(passId, new Wallet(signingKey.privateKey).address));
//   // proof[0] = proof[0].slice(0, 64) + 'FF'; // make it invalid

//   const BleepsInitialSale = <BleepsFixedPriceSale>await ethers.getContract('BleepsInitialSale', from);
//   const tx = await BleepsInitialSale.mintWithSalePass(tokenId, to, passId, joinSignature(signature), proof, {
//     value: parseEther('0.2'),
//   });
//   await tx.wait();
//   return tx;
// }

export async function mintViaMinterAdmin(tokenId: number, from: string, to: string): Promise<ContractTransaction> {
  let Bleeps = <Bleeps>await ethers.getContract('Bleeps');
  const currentMinterAdmin = await Bleeps.callStatic.minterAdmin();
  const currentMinter = await Bleeps.callStatic.minter();
  const isFromAlreadyMinter = currentMinter.toLowerCase() === from.toLowerCase();
  if (!isFromAlreadyMinter) {
    const minterTx = await Bleeps.setMinter(from);
    await minterTx.wait();
  }
  Bleeps = <Bleeps>await ethers.getContract('Bleeps', from);
  const tx = await Bleeps.mint(tokenId, to);
  await tx.wait();
  return tx;
}

export async function mintMultipleViaMinterAdmin(
  tokenIds: number[],
  from: string,
  tos: string[]
): Promise<ContractTransaction> {
  let Bleeps = <Bleeps>await ethers.getContract('Bleeps');
  const currentMinterAdmin = await Bleeps.callStatic.minterAdmin();
  const currentMinter = await Bleeps.callStatic.minter();
  const isFromAlreadyMinter = currentMinter.toLowerCase() === from.toLowerCase();
  if (!isFromAlreadyMinter) {
    const minterTx = await Bleeps.setMinter(from);
    await minterTx.wait();
  }
  Bleeps = <Bleeps>await ethers.getContract('Bleeps', from);
  const tx = await Bleeps.multiMint(tokenIds, tos);
  await tx.wait();
  return tx;
}

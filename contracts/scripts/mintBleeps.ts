import {joinSignature} from '@ethersproject/bytes';
import {calculateHash, hashLeaves, MerkleTree} from 'bleeps-common';
import {Wallet} from 'ethers';
import {parseEther, SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {getUnnamedAccounts, deployments, ethers} from 'hardhat';
import {BleepsFixedPriceSale} from '../typechain';

const args = process.argv.slice(2);
const passId = args[0];
const tokenId = args[0];

async function main() {
  const others = await getUnnamedAccounts();
  const from = others[0];
  const to = others[0];

  const {linkedData} = await deployments.get('BleepsInitialSale');
  const leaves = linkedData.leaves;
  const tree = new MerkleTree(hashLeaves(leaves));

  let privateKeys; // = //await deployments.loadDotFile()
  try {
    const dataStr = await deployments.readDotFile(`.privateKeys.json`);
    privateKeys = JSON.parse(dataStr);
  } catch (e) {}
  const signingKey = new SigningKey(privateKeys[passId]);
  const signature = signingKey.signDigest(solidityKeccak256(['uint256', 'address'], [passId, to]));
  const proof = tree.getProof(calculateHash(passId, new Wallet(signingKey.privateKey).address));
  // proof[0] = proof[0].slice(0, 64) + 'FF'; // make it invalid

  const BleepsInitialSale = <BleepsFixedPriceSale>await ethers.getContract('BleepsInitialSale', from);
  const tx = await BleepsInitialSale.mintWithSalePass(tokenId, to, passId, joinSignature(signature), proof, {
    value: parseEther('0.2'),
  });
  await tx.wait();

  // await execute(
  //   'BleepsInitialSale',
  //   {from: others[0], value: parseEther('0.2'), log: true},
  //   'mint',
  //   args[0],
  //   others[0]
  // );

  return tx;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

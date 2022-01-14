import {AddressZero} from '@ethersproject/constants';
import {parseEther} from 'ethers/lib/utils';
import {deployments, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
const {execute, read, log} = deployments;

async function main() {
  const unnamedAccounts = await getUnnamedAccounts();
  const bleepers = unnamedAccounts.slice(2); // first 2 user are not bleepers

  const {deployer} = await getNamedAccounts();

  const [ownerOfBleeps0] = await read('Bleeps', 'owners', [0]);

  if (ownerOfBleeps0 === AddressZero) {
    const currentMinterAdmin = await read('Bleeps', 'minterAdmin');
    const currentMinter = await read('Bleeps', 'minter');
    const isDeployerMinter = currentMinter.toLowerCase() === deployer;
    if (!isDeployerMinter) {
      await execute('Bleeps', {from: currentMinterAdmin, log: true, autoMine: true}, 'setMinter', deployer);
    }
    // await execute('Bleeps', {from: deployer, log: true}, 'multiMint', users.reduce<number[]>((prev, curr, i) => prev.concat([i]), []) , users)
    const numBleeps = 448;
    const numBleepsPerBleepers = Math.floor(numBleeps / bleepers.length);
    const extraBleeps = numBleeps - numBleepsPerBleepers * bleepers.length;

    const ids: number[] = [];
    const addresses: string[] = [];
    let bleepId = 0;
    for (let i = 0; i < bleepers.length; i++) {
      const bleeper = bleepers[i];
      for (let j = 0; j < numBleepsPerBleepers + (i < extraBleeps ? 1 : 0); j++) {
        ids.push(bleepId);
        addresses.push(bleeper);
        bleepId++;
      }
    }
    await execute('Bleeps', {from: deployer, log: true, autoMine: true}, 'multiMint', ids, addresses);
  } else {
    log(`already distributed`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

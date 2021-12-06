import 'dotenv/config';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import {Bleeps} from '../../typechain';

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);

console.log({blockNumber});

const filename = `bleepsOwners_at_${blockNumber}.json`;

async function main() {
  const owners = JSON.parse(fs.readFileSync(filename).toString());

  let numBleeps = 0;
  for (const owner of owners) {
    const {bleeps} = owner;
    numBleeps = numBleeps + bleeps.length;
  }

  console.log({owner: owners.length, bleeps: numBleeps});
}

main();

import 'dotenv/config';
import fs from 'fs-extra';
import {ethers} from 'hardhat';

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);

console.log({blockNumber});

const filename = `bleepsOwners_at_${blockNumber}.json`;

async function main() {
  const owners = JSON.parse(fs.readFileSync(filename).toString());

  for (const owner of owners) {
    const {id} = owner;

    const codeAtTo = await ethers.provider.getCode(id);
    if (codeAtTo !== '0x') {
      console.log(`contract at ${id}`);
    } else {
      console.log(`no contract for ${id}`);
    }
  }
}

main();

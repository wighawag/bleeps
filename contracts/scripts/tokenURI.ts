import {deployments} from 'hardhat';
const {read} = deployments;

const args = process.argv.slice(2);

async function main() {
  const tokenURI = await read('Bleeps', 'tokenURI', args[0]);
  console.log(tokenURI);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

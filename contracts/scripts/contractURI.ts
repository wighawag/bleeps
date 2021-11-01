import {deployments} from 'hardhat';
const {read} = deployments;

async function main() {
  const result = await read('Bleeps', 'contractURI');
  console.log(result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

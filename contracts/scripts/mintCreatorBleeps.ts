import {getUnnamedAccounts, deployments, getNamedAccounts} from 'hardhat';
const {execute} = deployments;

// const args = process.argv.slice(2);
// const to = args[0];

async function main() {
  const {projectCreator} = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  const to = users[0];

  await execute(
    'BleepsInitialSale',
    {from: projectCreator, log: true, autoMine: true},
    'creatorMultiMint',
    Array.from(Array(65)).map((v, i) => i + 448),
    to
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

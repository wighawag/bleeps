import {parseEther} from 'ethers/lib/utils';
import {getUnnamedAccounts, deployments} from 'hardhat';
const {execute} = deployments;

const args = process.argv.slice(2);

async function main() {
  const others = await getUnnamedAccounts();
  await execute(
    'BleepsInitialSale',
    {from: others[0], value: parseEther('0.2'), log: true},
    'mint',
    args[0],
    others[0]
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

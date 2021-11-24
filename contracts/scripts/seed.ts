import {parseEther} from 'ethers/lib/utils';
import {getUnnamedAccounts, deployments} from 'hardhat';
const {execute} = deployments;

async function main() {
  const others = await getUnnamedAccounts();
  await execute('MandalaToken', {from: others[0], log: true, autoMine: true}, 'mint', 1, others[0]);
  await execute(
    'BleepsInitialSale',
    {from: others[0], value: parseEther('2'), log: true, autoMine: true},
    'mint',
    1,
    others[0]
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

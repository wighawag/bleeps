import {parseEther} from 'ethers/lib/utils';
import {getUnnamedAccounts, deployments} from 'hardhat';
const {execute} = deployments;

async function main() {
  const others = await getUnnamedAccounts();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

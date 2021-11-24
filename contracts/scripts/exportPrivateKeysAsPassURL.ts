import {deployments, network} from 'hardhat';

let url = 'http://localhost:3000';

async function main() {
  if (network.name === 'staging') {
    url = 'https://goerli.bleeps.art';
  } else if (network.name === 'mainnet') {
    url = 'https://bleeps.art';
  }

  const privateKeys = JSON.parse(await deployments.readDotFile('.privateKeys.json'));
  console.log(privateKeys.map((v: string) => `${url}/mint/#passKey=${v}`));
}

main();

import {deployments, network} from 'hardhat';
const networkName = deployments.getNetworkName();

let url = 'http://localhost:3000';

async function main() {
  if (networkName === 'staging') {
    url = 'https://goerli.bleeps.art';
  } else if (networkName === 'mainnet') {
    url = 'https://bleeps.art';
  }

  const privateKeys = JSON.parse(await deployments.readDotFile('.privateKeys.json'));
  const passKeysURLs = privateKeys.map((v: string) => `${url}/mint/#passKey=${v}`);
  await deployments.saveDotFile('.passKeys.json', JSON.stringify(passKeysURLs, null, '  '));
  await deployments.saveDotFile('.passKeys.txt', passKeysURLs.join('\n'));
}

main();

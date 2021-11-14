import {deployments, getUnnamedAccounts, getNamedAccounts, network, ethers} from 'hardhat';

import {erc721} from 'ethereum-contracts-test-suite';
import {mintViaSalePass} from './utils/bleepsfixedsale';

erc721.runMochaTests('Bleeps ERC721', {}, async () => {
  //{burn: true}
  await deployments.fixture(['Bleeps', 'BleepsInitialSale']);
  const {deployer} = await getNamedAccounts();
  const Bleeps = await deployments.get('Bleeps');
  const users = await getUnnamedAccounts();
  let nextTokenId = 0;
  async function mint(to: string): Promise<{hash: string; tokenId: string}> {
    const tokenId = nextTokenId;
    nextTokenId++;
    const tx = await mintViaSalePass(tokenId, to, to);
    return {
      tokenId: '' + tokenId,
      hash: tx.hash,
    };
  }
  return {
    ethereum: network.provider,
    contractAddress: Bleeps.address,
    users,
    mint,
    deployer,
  };
});

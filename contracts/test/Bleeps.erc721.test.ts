import {deployments, getUnnamedAccounts, getNamedAccounts, network, ethers} from 'hardhat';

import {erc721} from 'ethereum-contracts-test-suite';
import {parseEther} from 'ethers/lib/utils';

erc721.runMochaTests('Bleeps ERC721', {}, async () => {
  //{burn: true}
  await deployments.fixture(['Bleeps']);
  const {deployer} = await getNamedAccounts();
  const Bleeps = await deployments.get('Bleeps');
  const users = await getUnnamedAccounts();
  let nextTokenId = 0;
  async function mint(to: string): Promise<{hash: string; tokenId: string}> {
    const tokenId = nextTokenId;
    nextTokenId++;
    const BleepsContract = await ethers.getContract('Bleeps', to);
    const tx = await BleepsContract.mint(tokenId, to, {value: parseEther('3')});
    await tx.wait();
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

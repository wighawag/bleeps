import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {defaultAbiCoder, formatEther, keccak256, parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {BigNumber} from 'ethers';

export type ProposalState = {
  id: BigNumber;
  proposer: string;
  eta: BigNumber;
  startBlock: BigNumber;
  endBlock: BigNumber;
  forVotes: BigNumber;
  againstVotes: BigNumber;
  abstainVotes: BigNumber;
  canceled: boolean;
  execute: boolean;
};

export async function getProposal(hre: HardhatRuntimeEnvironment): Promise<{
  description: string;
  targets: string[];
  values: (string | BigNumber)[];
  calldatas: string[];
  id: string;
}> {
  const BleepsDAOAccount = await hre.deployments.get('BleepsDAOAccount');

  const OldBleepsDAOAccount = await hre.deployments.get('old_BleepsDAOAccount');
  const balance = await hre.ethers.provider.getBalance(OldBleepsDAOAccount.address);

  const description = `send ${formatEther(balance)} ETH to ${BleepsDAOAccount.address}`;
  const targets = [BleepsDAOAccount.address];
  const values = [balance];
  const calldatas = ['0x'];

  const expectedProposalId = BigNumber.from(
    keccak256(
      defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'bytes[]', 'bytes32'],
        [targets, values, calldatas, solidityKeccak256(['string'], [description])]
      )
    )
  ).toString();

  return {
    description,
    targets,
    values,
    calldatas,
    id: expectedProposalId,
  };
}

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';
import {getProposal, ProposalState} from '../.data/.proposal_for_migration';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;

  const networkNane = await deployments.getNetworkName();
  if (networkNane === 'hardhat') {
    return;
  }

  const OldBleeps = await ethers.getContract('old_Bleeps');
  const {projectCreator} = await getNamedAccounts();

  log({projectCreator, OldBleeps: OldBleeps.address});

  const creatorBalance = await OldBleeps.balanceOf(projectCreator);
  const [creatorBatchOwner] = await OldBleeps.callStatic.owners([448]);
  if (creatorBatchOwner === AddressZero) {
    await execute(
      'BleepsInitialSale',
      {from: projectCreator, log: true, autoMine: true},
      'creatorMultiMint',
      Array.from(Array(65)).map((v, i) => i + 448),
      projectCreator
    );
  } else if (creatorBalance.lt(65)) {
    log(`creator has not enough votes : ${creatorBalance.toString()}`);
    await execute(
      'BleepsInitialSale',
      {from: projectCreator, log: true, autoMine: true},
      'creatorMultiMint',
      Array.from(Array(63)).map((v, i) => i + 513),
      projectCreator
    );
  }

  const proposal = await getProposal(hre);

  let proposalState: ProposalState | undefined;
  try {
    proposalState = await read('old_BleepsDAOGovernor', 'proposals', proposal.id);
    log(`proposal submitted`);
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // cannot detect error as on real network it somestime does not output the reason string
    // if ((e as any).message.indexOf('Governor: unknown proposal id') === -1) {
    //   throw e;
    // }
  }

  if (proposalState === undefined) {
    log('proposing: "' + proposal.description + '" ...');
    const receipt = await execute(
      'old_BleepsDAOGovernor',
      {from: projectCreator, log: true, autoMine: true},
      'propose(address[],uint256[],bytes[],string)',
      proposal.targets,
      proposal.values,
      proposal.calldatas,
      proposal.description
    );

    if (!receipt.events) {
      throw new Error('no events');
    }
    const proposalId = receipt.events[0].args?.proposalId.toString();
    log({proposalId, expectedProposalId: proposal.id});
  }
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsInitialSale_deploy', 'BleepsDAOAccount_deploy'];

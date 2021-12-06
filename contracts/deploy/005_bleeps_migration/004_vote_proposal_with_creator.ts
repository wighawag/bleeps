import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getProposal, ProposalState} from '../.data/.proposal_for_migration';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {execute, read, log} = deployments;

  const networkNane = await deployments.getNetworkName();
  if (networkNane === 'hardhat') {
    return;
  }

  const {projectCreator} = await getNamedAccounts();

  const proposal = await getProposal(hre);

  const voted = await read('old_BleepsDAOGovernor', 'hasVoted', proposal.id, projectCreator);

  if (voted) {
    log(`already voted`);
    return;
  }

  if (network.name === 'hardhat') {
    log(`skipping one block (votingDelay)...`);
    for (let i = 0; i < 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }
  }

  const latestBlock = await ethers.provider.getBlock('latest');
  const proposalState: ProposalState = await read('old_BleepsDAOGovernor', 'proposals', proposal.id);
  if (proposalState.startBlock.gte(latestBlock.number)) {
    log(`skip vote as it need to be executed one block later`);
    return;
  }

  await execute('old_BleepsDAOGovernor', {from: projectCreator, log: true, autoMine: true}, 'castVote', proposal.id, 1);
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsInitialSale_deploy', 'BleepsDAOAccount_deploy'];

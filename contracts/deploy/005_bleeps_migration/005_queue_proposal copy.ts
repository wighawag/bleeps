import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getProposal, ProposalState} from '../.data/.proposal_for_migration';
import {ethers, network} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {execute, read, log} = deployments;

  const networkNane = await deployments.getNetworkName();
  if (networkNane === 'hardhat') {
    return;
  }

  const {projectCreator} = await getNamedAccounts();

  const proposal = await getProposal(hre);

  if (network.name === 'hardhat') {
    log('skipping 45818 blocks (votingPeriod)...');
    for (let i = 0; i < 45818 + 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }
  }

  const latestBlock = await ethers.provider.getBlock('latest');
  const proposalState: ProposalState = await read('old_BleepsDAOGovernor', 'proposals', proposal.id);
  if (proposalState.endBlock.gte(latestBlock.number)) {
    log(
      `skip queue are voting period not yet over : ${proposalState.endBlock
        .sub(latestBlock.number)
        .toNumber()} blocks to wait`
    );
    return;
  }

  log('queuing...');
  await execute(
    'old_BleepsDAOGovernor',
    {from: projectCreator, log: true, autoMine: true},
    'queue(uint256)',
    proposal.id
  );
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsInitialSale_deploy', 'BleepsDAOAccount_deploy'];
func.skip = async () => network.name !== 'hardhat'; // TODO for now, skip as it will fails

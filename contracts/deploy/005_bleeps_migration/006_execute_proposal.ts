import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers, network} from 'hardhat';
import {formatEther} from 'ethers/lib/utils';
import {getProposal} from '../.data/.proposal_for_migration';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {execute, log} = deployments;

  const networkNane = await deployments.getNetworkName();
  if (networkNane === 'hardhat') {
    return;
  }

  const oldGovernor = await deployments.getOrNull('old_BleepsDAOGovernor');
  if (!oldGovernor) {
    return;
  }

  const {projectCreator} = await getNamedAccounts();

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  const proposal = await getProposal(hre);

  if (network.name === 'hardhat') {
    log(`skipping 2 days for timelock...`);
    const block = await ethers.provider.getBlock('latest');

    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block.timestamp + 2 * 24 * 3600],
    });
  }

  // TODO use timestamp for queue
  // const latestBlock = await ethers.provider.getBlock('latest');
  // const proposalState: ProposalState = await read('old_BleepsDAOGovernor', 'proposals', proposal.id);
  // if (proposalState.endBlock.gte(latestBlock.number)) {
  //   log(
  //     `skip queue are voting period not yet over : ${proposalState.endBlock
  //       .sub(latestBlock.number)
  //       .toNumber()} blocks to wait`
  //   );
  //   return;
  // }

  log('executing...');
  await execute(
    'old_BleepsDAOGovernor',
    {from: projectCreator, log: true, autoMine: true},
    'execute(uint256)',
    proposal.id
  );

  const balance = await ethers.provider.getBalance(BleepsDAOAccount.address);
  log({balance: formatEther(balance)});
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsInitialSale_deploy', 'BleepsDAOAccount_deploy'];
func.skip = async () => network.name !== 'hardhat'; // TODO for now, skip as it will fails

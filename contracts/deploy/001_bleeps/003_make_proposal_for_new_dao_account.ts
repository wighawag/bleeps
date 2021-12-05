import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import {formatEther, parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network} = hre;
  const {execute} = deployments;

  const {projectCreator} = await getNamedAccounts();

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  await execute(
    'BleepsInitialSale',
    {from: projectCreator, log: true, autoMine: true},
    'creatorMultiMint',
    Array.from(Array(65)).map((v, i) => i + 448),
    projectCreator
  );

  const message = `send 33.6 ETH to ${BleepsDAOAccount.address}`;

  const receipt = await execute(
    'old_BleepsDAOGovernor',
    {from: projectCreator, log: true, autoMine: true},
    'propose(address[],uint256[],bytes[],string)',
    [BleepsDAOAccount.address],
    [parseEther('33.6')],
    ['0x'],
    message
  );

  if (!receipt.events) {
    throw new Error('no events');
  }
  const proposalId = receipt.events[0].args?.proposalId;

  if (network.name === 'hardhat') {
    // skip 1 blocks (votingDelay)
    for (let i = 0; i < 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }
  }

  await execute('old_BleepsDAOGovernor', {from: projectCreator, log: true, autoMine: true}, 'castVote', proposalId, 1);

  if (network.name === 'hardhat') {
    console.log('skipping blocks...');
    // skip 45818 blocks (votingPeriod)
    for (let i = 0; i < 45818 + 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }
  }

  console.log('queuing...');
  await execute(
    'old_BleepsDAOGovernor',
    {from: projectCreator, log: true, autoMine: true},
    'queue(uint256)',
    proposalId
  );

  if (network.name === 'hardhat') {
    const block = await ethers.provider.getBlock('latest');
    // delay 2 days for timelock
    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block.timestamp + 2 * 24 * 3600],
    });
  }

  console.log('executing...');
  console.log('queuing...');
  await execute(
    'old_BleepsDAOGovernor',
    {from: projectCreator, log: true, autoMine: true},
    'execute(uint256)',
    proposalId
  );

  const balance = await ethers.provider.getBalance(BleepsDAOAccount.address);
  console.log({balance: formatEther(balance)});
};
export default func;
func.tags = ['BleepsDAOAccount', 'BleepsDAOAccount_setup'];
func.dependencies = ['BleepsDAOAccount_deploy'];

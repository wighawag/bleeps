import {formatEther, parseEther} from 'ethers/lib/utils';
import {getUnnamedAccounts, ethers, network} from 'hardhat';
import {setupUsers} from '../test/utils';
import {Bleeps, BleepsDAOAccount, BleepsDAOGovernor, IBleepsSale} from '../typechain';
import {waitFor} from '../utils';

const args = process.argv.slice(2);

const to = args[0];

async function main() {
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <IBleepsSale>await ethers.getContract('BleepsInitialSale'),
    BleepsDAOGovernor: <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor'),
    BleepsDAOAccount: <BleepsDAOAccount>await ethers.getContract('BleepsDAOAccount'),
  };

  const users = await setupUsers(await getUnnamedAccounts(), contracts);

  const message = `send 0.075 ETH to ${to}`;
  console.log(`proposing "${message}" ...`);
  const receipt = await waitFor(
    users[0].BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
      [to],
      [parseEther('0.075')],
      ['0x'],
      message
    )
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

  console.log('casting vote...');
  await users[0].BleepsDAOGovernor.castVote(proposalId, 1); // vote

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
  await users[0].BleepsDAOGovernor['queue(uint256)'](proposalId); // queue

  const block = await ethers.provider.getBlock('latest');

  if (network.name === 'hardhat') {
    // delay 2 days for timelock
    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block.timestamp + 2 * 24 * 3600],
    });
  }

  console.log('executing...');
  await users[0].BleepsDAOGovernor['execute(uint256)'](proposalId); // execute

  const balance = await ethers.provider.getBalance(to);
  console.log({balance: formatEther(balance)});
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

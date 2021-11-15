import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
import {Bleeps, BleepsDAOAccount, BleepsDAOGovernor, IBleepsSale} from '../typechain';
import {setupNamedUsers, setupUsers, waitFor} from './utils';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {DelegationSignerFactory} from './utils/eip712';
import {mintViaSalePass} from './utils/bleepsfixedsale';

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['BleepsDAOGovernor']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <IBleepsSale>await ethers.getContract('BleepsInitialSale'),
    BleepsDAOGovernor: <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor'),
    BleepsDAOAccount: <BleepsDAOAccount>await ethers.getContract('BleepsDAOAccount'),
  };
  const DelegationSigner = DelegationSignerFactory.createSigner({
    verifyingContract: contracts.Bleeps.address,
  });

  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  const accounts = await setupNamedUsers(await getNamedAccounts(), contracts);
  return {
    ...contracts,
    users,
    accounts,
    DelegationSigner,
  };
});
describe('BleepsDAOGovernor', function () {
  it('cannot propose with no Bleeps', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();
    await deployments.rawTx({from: accounts.deployer.address, to: BleepsDAOAccount.address, value: parseEther('1')});
    await expect(
      accounts.daoVetoer.BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
        [users[0].address],
        [parseEther('1')],
        ['0x'],
        'send 1 ETH to user 0'
      )
    ).to.be.revertedWith('GovernorCompatibilityBravo: proposer votes below proposal threshold');
  });

  it('propose', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();
    await mintViaSalePass(0, users[0].address, users[0].address);
    await deployments.rawTx({from: accounts.deployer.address, to: BleepsDAOAccount.address, value: parseEther('1')});
    await waitFor(
      users[0].BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
        [users[0].address],
        [parseEther('1')],
        ['0x'],
        'send 1 ETH to user 0'
      )
    );
  });

  it('cannot veto if not vetoer', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();
    await mintViaSalePass(0, users[0].address, users[0].address);
    await deployments.rawTx({from: accounts.deployer.address, to: BleepsDAOAccount.address, value: parseEther('1')});
    const receipt = await waitFor(
      users[0].BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
        [users[0].address],
        [parseEther('1')],
        ['0x'],
        'send 1 ETH to user 0'
      )
    );

    if (!receipt.events) {
      throw new Error('no events');
    }

    await expect(users[0].BleepsDAOGovernor.veto(receipt.events[0].args?.proposalId)).to.be.revertedWith(
      'GovernorBravo: not vetoer'
    );
  });

  it('veto', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();
    await mintViaSalePass(0, users[0].address, users[0].address);
    await deployments.rawTx({from: accounts.deployer.address, to: BleepsDAOAccount.address, value: parseEther('1')});
    const receipt = await waitFor(
      users[0].BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
        [users[0].address],
        [parseEther('1')],
        ['0x'],
        'send 1 ETH to user 0'
      )
    );

    if (!receipt.events) {
      throw new Error('no events');
    }

    await accounts.daoVetoer.BleepsDAOGovernor.veto(receipt.events[0].args?.proposalId);
  });
});

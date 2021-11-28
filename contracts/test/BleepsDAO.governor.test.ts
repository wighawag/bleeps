import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts, getNamedAccounts, network} from 'hardhat';
import {Bleeps, BleepsDAOAccount, BleepsDAOGovernor, IBleepsSale} from '../typechain';
import {setupNamedUsers, setupUsers, waitFor} from './utils';
import {parseEther} from 'ethers/lib/utils';
import {DelegationSignerFactory} from './utils/eip712';
import {mintViaSalePass} from './utils/bleepsfixedsale';

const ZeroBytes = '0x0000000000000000000000000000000000000000000000000000000000000000';

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

  it('random user cannot change proposer', async function () {
    const {users, BleepsDAOAccount} = await setup();
    const proposerRole = await BleepsDAOAccount.callStatic.PROPOSER_ROLE();
    const adminRole = await BleepsDAOAccount.callStatic.TIMELOCK_ADMIN_ROLE();
    await expect(users[0].BleepsDAOAccount.grantRole(proposerRole, users[0].address)).to.be.revertedWith(
      `AccessControl: account ${users[0].address.toLowerCase()} is missing role ${adminRole}`
    );
  });

  // it('BleepsDAOGovernor can change proposer', async function () {
  //   const {users, BleepsDAOAccount, BleepsDAOGovernor} = await setup();
  //   const proposerRole = await BleepsDAOAccount.callStatic.PROPOSER_ROLE();
  //   const adminRole = await BleepsDAOAccount.callStatic.TIMELOCK_ADMIN_ROLE();
  //   await network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [BleepsDAOGovernor.address],
  //   });
  //   await users[0].signer.sendTransaction({to: BleepsDAOGovernor.address, value: parseEther('1')});
  //   const signer = await ethers.getSigner(BleepsDAOGovernor.address);
  //   console.log({
  //     BleepsDAOGovernor: BleepsDAOGovernor.address,
  //     proposerRole,
  //     adminRole,
  //   });
  //   await waitFor(BleepsDAOAccount.connect(signer).grantRole(proposerRole, users[0].address));
  // });

  it('BleepsDAOAccount can change its own proposer', async function () {
    const {users, BleepsDAOAccount} = await setup();
    const proposerRole = await BleepsDAOAccount.callStatic.PROPOSER_ROLE();
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [BleepsDAOAccount.address],
    });
    await users[0].signer.sendTransaction({to: BleepsDAOAccount.address, value: parseEther('1')});
    const signer = await ethers.getSigner(BleepsDAOAccount.address);
    await waitFor(BleepsDAOAccount.connect(signer).grantRole(proposerRole, users[0].address));
  });

  it('cannot change proposer once immortalised', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();
    const proposerRole = await BleepsDAOAccount.callStatic.PROPOSER_ROLE();
    // const adminRole = await BleepsDAOAccount.callStatic.TIMELOCK_ADMIN_ROLE();
    const voidRole = await BleepsDAOAccount.callStatic.VOID_ROLE();
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [BleepsDAOAccount.address],
    });
    await users[0].signer.sendTransaction({to: BleepsDAOAccount.address, value: parseEther('1')});
    const signer = await ethers.getSigner(BleepsDAOAccount.address);

    await accounts.daoGuardian.BleepsDAOAccount.immortalizeGovernance();
    await expect(BleepsDAOAccount.connect(signer).grantRole(proposerRole, users[0].address)).to.be.revertedWith(
      `AccessControl: account ${BleepsDAOAccount.address.toLowerCase()} is missing role ${voidRole}`
    );
  });

  it('vote', async function () {
    const {users, accounts, BleepsDAOAccount} = await setup();

    // await mintViaSalePass(0, users[0].address, users[0].address);
    await waitFor(
      accounts.projectCreator.BleepsInitialSale.creatorMultiMint(
        Array.from(Array(65)).map((v, i) => i + 448),
        users[0].address
      )
    );

    console.log('proposing...');
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
    const proposalId = receipt.events[0].args?.proposalId;

    // skip 1 blocks (votingDelay)
    for (let i = 0; i < 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }

    console.log('casting vote...');
    await users[0].BleepsDAOGovernor.castVote(proposalId, 1); // vote

    console.log('skipping blocks...');
    // skip 45818 blocks (votingPeriod)
    for (let i = 0; i < 45818 + 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }

    console.log('queuing...');
    await users[1].BleepsDAOGovernor['queue(uint256)'](proposalId); // queue

    const block = await ethers.provider.getBlock('latest');

    // delay 2 days for timelock
    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block.timestamp + 2 * 24 * 3600],
    });

    console.log('executing...');
    await users[1].BleepsDAOGovernor['execute(uint256)'](proposalId); // execute
  });

  it('vote to change governor', async function () {
    const {users, accounts, BleepsDAOAccount, BleepsDAOGovernor} = await setup();

    const proposerRole = await BleepsDAOAccount.callStatic.PROPOSER_ROLE();
    // const adminRole = await BleepsDAOAccount.callStatic.TIMELOCK_ADMIN_ROLE();
    // const voidRole = await BleepsDAOAccount.callStatic.VOID_ROLE();

    // console.log({
    //   proposerRole,
    //   adminRole,
    //   voidRole,
    //   BleepsDAOAccount: BleepsDAOAccount.address,
    //   BleepsDAOGovernor: BleepsDAOGovernor.address,
    //   user0: users[0].address,
    // });

    // await mintViaSalePass(0, users[0].address, users[0].address);
    await waitFor(
      accounts.projectCreator.BleepsInitialSale.creatorMultiMint(
        Array.from(Array(65)).map((v, i) => i + 448),
        users[0].address
      )
    );

    await deployments.rawTx({from: accounts.deployer.address, to: BleepsDAOAccount.address, value: parseEther('1')});
    const grantProposerData = await BleepsDAOAccount.populateTransaction.grantRole(proposerRole, users[2].address);
    const revokeProposerData = await BleepsDAOAccount.populateTransaction.revokeRole(
      proposerRole,
      BleepsDAOGovernor.address
    );
    if (!grantProposerData.to || !revokeProposerData.to || !grantProposerData.data || !revokeProposerData.data) {
      throw new Error(`invalid tx data`);
    }
    const receipt = await waitFor(
      users[0].BleepsDAOGovernor['propose(address[],uint256[],bytes[],string)'](
        [grantProposerData.to, revokeProposerData.to],
        [0, 0],
        [grantProposerData.data, revokeProposerData.data],
        'change governor'
      )
    );

    if (!receipt.events) {
      throw new Error('no events');
    }
    const proposalId = receipt.events[0].args?.proposalId;

    // skip 1 blocks (votingDelay)
    for (let i = 0; i < 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }

    await users[0].BleepsDAOGovernor.castVote(proposalId, 1); // vote

    console.log('skipping blocks...');
    // skip 45818 blocks (votingPeriod)
    for (let i = 0; i < 45818 + 1; i++) {
      await network.provider.request({
        method: 'evm_mine',
        params: [],
      });
    }

    // const state = await BleepsDAOGovernor.state(proposalId);
    // console.log({state});
    await users[1].BleepsDAOGovernor['queue(uint256)'](proposalId); // queue

    // console.log('execute...');
    const block = await ethers.provider.getBlock('latest');

    // delay 2 days for timelock
    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block.timestamp + 2 * 24 * 3600],
    });

    await users[1].BleepsDAOGovernor['execute(uint256)'](proposalId); // execute

    const grantProposerData2 = await BleepsDAOAccount.populateTransaction.grantRole(proposerRole, users[3].address);
    if (!grantProposerData2.to || !grantProposerData2.data) {
      throw new Error(`invalid tx data for second`);
    }
    await users[2].BleepsDAOAccount.schedule(
      grantProposerData2.to,
      0,
      grantProposerData2.data,
      ZeroBytes,
      ZeroBytes,
      2 * 24 * 3600
    );

    const block2 = await ethers.provider.getBlock('latest');
    // delay 2 days for timelock
    await network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [block2.timestamp + 2 * 24 * 3600],
    });

    await users[2].BleepsDAOAccount.execute(grantProposerData2.to, 0, grantProposerData2.data, ZeroBytes, ZeroBytes);

    await users[3].BleepsDAOAccount.schedule(
      grantProposerData2.to,
      0,
      grantProposerData2.data,
      ZeroBytes,
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      2 * 24 * 3600
    );

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [BleepsDAOAccount.address],
    });
    const signer = await ethers.getSigner(BleepsDAOAccount.address);
    await expect(
      BleepsDAOAccount.connect(signer).schedule(
        grantProposerData2.to,
        0,
        grantProposerData2.data,
        ZeroBytes,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        2 * 24 * 3600
      )
    ).to.be.revertedWith(
      `AccessControl: account ${BleepsDAOAccount.address.toLowerCase()} is missing role ${proposerRole}`
    );
  });
});

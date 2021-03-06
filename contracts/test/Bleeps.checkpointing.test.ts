import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, IBleepsSale} from '../typechain';
import {setupUsers} from './utils';
import {DelegationSignerFactory} from './utils/eip712';
import {splitSignature} from '@ethersproject/bytes';
import {mintViaMinterAdmin} from './utils/bleepsfixedsale';

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['Bleeps']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
  };
  const DelegationSigner = DelegationSignerFactory.createSigner({
    verifyingContract: contracts.Bleeps.address,
  });

  const users = await setupUsers(await getUnnamedAccounts(), contracts);

  await mintViaMinterAdmin(1, users[0].address, users[0].address);
  await mintViaMinterAdmin(2, users[0].address, users[0].address);
  await mintViaMinterAdmin(3, users[0].address, users[0].address);
  await mintViaMinterAdmin(4, users[0].address, users[0].address);
  await mintViaMinterAdmin(5, users[0].address, users[0].address);

  const tokenHolder = users[0];
  users.shift();

  const delegatee = users[0];
  users.shift();

  return {
    ...contracts,
    users,
    tokenHolder,
    delegatee,
    DelegationSigner,
  };
});
describe('Bleeps Checkpointing', function () {
  it('delegation via signature works', async function () {
    const {users, tokenHolder, delegatee, DelegationSigner, Bleeps} = await setup();

    const delegatee2 = users[0];

    const nonce = 0;
    const expiry = 4000000000;

    const signature = await DelegationSigner.sign(tokenHolder, {
      delegatee: delegatee.address,
      nonce,
      expiry,
    });

    const {v, r, s} = splitSignature(signature);

    const previousVoteForTokenHolder = await Bleeps.getCurrentVotes(tokenHolder.address);
    const previousVoteForDelegatee = await Bleeps.getCurrentVotes(delegatee.address);
    const previousVoteForDelegatee2 = await Bleeps.getCurrentVotes(delegatee2.address);

    await delegatee.Bleeps.delegateBySig(delegatee.address, nonce, expiry, v, r, s);

    const newVoteForTokenHolder = await Bleeps.getCurrentVotes(tokenHolder.address);
    const newVoteForDelegatee = await Bleeps.getCurrentVotes(delegatee.address);

    expect(newVoteForTokenHolder).to.equal(0);
    expect(newVoteForDelegatee).to.equal(previousVoteForTokenHolder.add(previousVoteForDelegatee));

    const signature2 = await DelegationSigner.sign(tokenHolder, {
      delegatee: delegatee2.address,
      nonce: nonce + 1,
      expiry,
    });

    const {v: v2, r: r2, s: s2} = splitSignature(signature2);

    await expect(delegatee2.Bleeps.delegateBySig(delegatee2.address, nonce + 2, expiry, v2, r2, s2)).to.be.revertedWith(
      'ERC721Checkpointable::delegateBySig: invalid nonce'
    );

    await delegatee2.Bleeps.delegateBySig(delegatee.address, nonce, expiry, v2, r2, s2); // do not revert but affect someone else account

    {
      const newVoteForTokenHolder = await Bleeps.getCurrentVotes(tokenHolder.address);
      const newVoteForDelegatee = await Bleeps.getCurrentVotes(delegatee.address);

      expect(newVoteForTokenHolder).to.equal(0);
      expect(newVoteForDelegatee).to.equal(previousVoteForTokenHolder.add(previousVoteForDelegatee));
    }

    await delegatee2.Bleeps.delegateBySig(delegatee2.address, nonce + 1, expiry, v2, r2, s2);

    const latestVoteForTokenHolder = await Bleeps.getCurrentVotes(tokenHolder.address);
    const latestVoteForDelegatee = await Bleeps.getCurrentVotes(delegatee.address);
    const newVoteForDelegatee2 = await Bleeps.getCurrentVotes(delegatee2.address);

    expect(latestVoteForTokenHolder).to.equal(0);
    expect(latestVoteForDelegatee).to.equal(0);
    expect(newVoteForDelegatee2).to.equal(previousVoteForTokenHolder.add(previousVoteForDelegatee2));
  });
});

import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {encodeFunctionData, parseEther} from 'viem';
import {setupFixtures, getEvent, type Fixtures} from './utils/index.js';
import {
	mintMultipleViaMinterAdmin,
	mintViaMinterAdmin,
} from './utils/bleeps.js';

const {provider, networkHelpers} = await network.create();
const {deployAll} = setupFixtures(provider);

const ZERO_BYTES32 =
	'0x0000000000000000000000000000000000000000000000000000000000000000';

const TIMELOCK_DELAY = 2 * 24 * 3600;

/**
 * Enough Bleeps to clear the proposal threshold and, on their own, the quorum.
 *
 * Taken from the top of the id range so they do not collide with the single
 * token the simpler tests mint.
 */
const VOTING_BLOCK = Array.from(Array(65)).map((_, i) => i + 448);

/**
 * A view of a deployment whose ABI keeps only one member of an overloaded set.
 *
 * GovernorCompatibilityBravo overloads `propose`, `queue` and `execute`, and
 * viem resolves overloads by argument shape, which is ambiguous here (both
 * `queue` overloads would accept what we pass). Narrowing the ABI says which
 * one we mean, unambiguously and at the call site.
 */
function pickOverload<D extends {abi: readonly unknown[]}>(
	deployment: D,
	name: string,
	inputCount: number,
): D {
	return {
		...deployment,
		abi: (deployment.abi as any[]).filter(
			(entry) =>
				entry.type !== 'function' ||
				entry.name !== name ||
				entry.inputs.length === inputCount,
		),
	};
}

/**
 * Send a transaction from an address we do not hold the key for.
 *
 * The timelock acts on its own roles, so some of these tests have to be the
 * timelock. rocketh only knows how to sign for the provider's own accounts, so
 * this goes straight at the node.
 */
async function sendAsImpersonated(
	from: `0x${string}`,
	to: `0x${string}`,
	data: `0x${string}`,
): Promise<void> {
	await networkHelpers.impersonateAccount(from);
	await provider.request({
		method: 'eth_sendTransaction',
		params: [{from, to, data}],
	});
}

async function propose(
	{env, BleepsDAOGovernor}: Pick<Fixtures, 'env' | 'BleepsDAOGovernor'>,
	account: `0x${string}`,
	targets: `0x${string}`[],
	values: bigint[],
	calldatas: `0x${string}`[],
	description: string,
) {
	return env.execute(pickOverload(BleepsDAOGovernor, 'propose', 4), {
		account,
		functionName: 'propose',
		args: [targets, values, calldatas, description],
	} as never);
}

/** Run a proposal all the way through: vote, wait, queue, wait, execute. */
async function passProposal(
	fixtures: Fixtures,
	voter: `0x${string}`,
	executor: `0x${string}`,
	proposalId: bigint,
) {
	const {env, BleepsDAOGovernor} = fixtures;

	const votingDelay = await env.read(BleepsDAOGovernor, {
		functionName: 'votingDelay',
	});
	const votingPeriod = await env.read(BleepsDAOGovernor, {
		functionName: 'votingPeriod',
	});

	// mine in bulk: the voting period is ~45,818 blocks and mining them one
	// JSON-RPC call at a time takes minutes
	await networkHelpers.mine(Number(votingDelay) + 1);

	await env.execute(BleepsDAOGovernor, {
		account: voter,
		functionName: 'castVote',
		args: [proposalId, 1],
	});

	await networkHelpers.mine(Number(votingPeriod) + 1);

	await env.execute(pickOverload(BleepsDAOGovernor, 'queue', 1), {
		account: executor,
		functionName: 'queue',
		args: [proposalId],
	} as never);

	await networkHelpers.time.increase(TIMELOCK_DELAY);

	await env.execute(pickOverload(BleepsDAOGovernor, 'execute', 1), {
		account: executor,
		functionName: 'execute',
		args: [proposalId],
	} as never);
}

describe('BleepsDAOGovernor', function () {
	it('cannot propose with no Bleeps', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, BleepsDAOAccount, namedAccounts, unnamedAccounts} = fixtures;

		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});

		await expect(
			propose(
				fixtures,
				namedAccounts.daoVetoer,
				[unnamedAccounts[0]],
				[parseEther('1')],
				['0x'],
				'send 1 ETH to user 0',
			),
		).toBeRejectedWith(
			'GovernorCompatibilityBravo: proposer votes below proposal threshold',
		);
	});

	it('propose', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {env, BleepsDAOAccount, namedAccounts, unnamedAccounts} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			0,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);
		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});

		const receipt = await propose(
			fixtures,
			unnamedAccounts[0],
			[unnamedAccounts[0]],
			[parseEther('1')],
			['0x'],
			'send 1 ETH to user 0',
		);

		const event = getEvent(
			receipt,
			fixtures.BleepsDAOGovernor.abi,
			'ProposalCreated',
		);
		expect(typeof event.args.proposalId).toEqual('bigint');
	});

	it('cannot veto if not vetoer', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {
			env,
			BleepsDAOGovernor,
			BleepsDAOAccount,
			namedAccounts,
			unnamedAccounts,
		} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			0,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);
		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});
		const receipt = await propose(
			fixtures,
			unnamedAccounts[0],
			[unnamedAccounts[0]],
			[parseEther('1')],
			['0x'],
			'send 1 ETH to user 0',
		);
		const proposalId = getEvent(
			receipt,
			BleepsDAOGovernor.abi,
			'ProposalCreated',
		).args.proposalId as bigint;

		await expect(
			env.execute(BleepsDAOGovernor, {
				account: unnamedAccounts[0],
				functionName: 'veto',
				args: [proposalId],
			}),
		).toBeRejectedWith('GovernorBravo: not vetoer');
	});

	it('veto', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {
			env,
			BleepsDAOGovernor,
			BleepsDAOAccount,
			namedAccounts,
			unnamedAccounts,
		} = fixtures;

		await mintViaMinterAdmin(
			fixtures,
			0,
			unnamedAccounts[0],
			unnamedAccounts[0],
		);
		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});
		const receipt = await propose(
			fixtures,
			unnamedAccounts[0],
			[unnamedAccounts[0]],
			[parseEther('1')],
			['0x'],
			'send 1 ETH to user 0',
		);
		const proposalId = getEvent(
			receipt,
			BleepsDAOGovernor.abi,
			'ProposalCreated',
		).args.proposalId as bigint;

		await env.execute(BleepsDAOGovernor, {
			account: namedAccounts.daoVetoer,
			functionName: 'veto',
			args: [proposalId],
		});
	});

	it('random user cannot change proposer', async function () {
		const {env, BleepsDAOAccount, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const proposerRole = await env.read(BleepsDAOAccount, {
			functionName: 'PROPOSER_ROLE',
		});
		const adminRole = await env.read(BleepsDAOAccount, {
			functionName: 'TIMELOCK_ADMIN_ROLE',
		});

		await expect(
			env.execute(BleepsDAOAccount, {
				account: unnamedAccounts[0],
				functionName: 'grantRole',
				args: [proposerRole, unnamedAccounts[0]],
			}),
		).toBeRejectedWith(
			`AccessControl: account ${unnamedAccounts[0].toLowerCase()} is missing role ${adminRole}`,
		);
	});

	it('BleepsDAOAccount can change its own proposer', async function () {
		const {env, BleepsDAOAccount, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const proposerRole = await env.read(BleepsDAOAccount, {
			functionName: 'PROPOSER_ROLE',
		});

		// The timelock is its own admin, so acting AS the timelock is allowed.
		await env.tx({
			account: unnamedAccounts[0],
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});
		await sendAsImpersonated(
			BleepsDAOAccount.address,
			BleepsDAOAccount.address,
			encodeFunctionData({
				abi: BleepsDAOAccount.abi,
				functionName: 'grantRole',
				args: [proposerRole, unnamedAccounts[0]],
			}),
		);

		expect(
			await env.read(BleepsDAOAccount, {
				functionName: 'hasRole',
				args: [proposerRole, unnamedAccounts[0]],
			}),
		).toEqual(true);
	});

	it('cannot change proposer once immortalised', async function () {
		const {env, BleepsDAOAccount, namedAccounts, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const proposerRole = await env.read(BleepsDAOAccount, {
			functionName: 'PROPOSER_ROLE',
		});
		const voidRole = await env.read(BleepsDAOAccount, {
			functionName: 'VOID_ROLE',
		});

		await env.tx({
			account: unnamedAccounts[0],
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});

		// Immortalising points every role's admin at VOID_ROLE, which nobody
		// holds and nobody can be granted. After this the governance wiring is
		// frozen, including for the timelock itself.
		await env.execute(BleepsDAOAccount, {
			account: namedAccounts.daoGuardian,
			functionName: 'immortalizeGovernance',
		});

		await expect(
			sendAsImpersonated(
				BleepsDAOAccount.address,
				BleepsDAOAccount.address,
				encodeFunctionData({
					abi: BleepsDAOAccount.abi,
					functionName: 'grantRole',
					args: [proposerRole, unnamedAccounts[0]],
				}),
			),
		).toBeRejectedWith(
			`AccessControl: account ${BleepsDAOAccount.address.toLowerCase()} is missing role ${voidRole}`,
		);
	});

	it('vote', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {
			env,
			BleepsDAOGovernor,
			BleepsDAOAccount,
			namedAccounts,
			unnamedAccounts,
		} = fixtures;

		await mintMultipleViaMinterAdmin(
			fixtures,
			VOTING_BLOCK,
			namedAccounts.projectCreator,
			VOTING_BLOCK.map(() => unnamedAccounts[0]),
		);

		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});

		const balanceBefore = await env.viem.publicClient.getBalance({
			address: unnamedAccounts[0],
		});

		const receipt = await propose(
			fixtures,
			unnamedAccounts[0],
			[unnamedAccounts[0]],
			[parseEther('1')],
			['0x'],
			'send 1 ETH to user 0',
		);
		const proposalId = getEvent(
			receipt,
			BleepsDAOGovernor.abi,
			'ProposalCreated',
		).args.proposalId as bigint;

		await passProposal(
			fixtures,
			unnamedAccounts[0],
			unnamedAccounts[1],
			proposalId,
		);

		// The proposal actually moved the money, which is the only proof the
		// whole pipeline worked rather than merely not reverting.
		expect(
			await env.viem.publicClient.getBalance({
				address: BleepsDAOAccount.address,
			}),
		).toEqual(0n);
		const balanceAfter = await env.viem.publicClient.getBalance({
			address: unnamedAccounts[0],
		});
		expect(balanceAfter > balanceBefore).toEqual(true);
	});

	it('vote to change governor', async function () {
		const fixtures = await networkHelpers.loadFixture(deployAll);
		const {
			env,
			BleepsDAOGovernor,
			BleepsDAOAccount,
			namedAccounts,
			unnamedAccounts,
		} = fixtures;

		const proposerRole = await env.read(BleepsDAOAccount, {
			functionName: 'PROPOSER_ROLE',
		});

		await mintMultipleViaMinterAdmin(
			fixtures,
			VOTING_BLOCK,
			namedAccounts.projectCreator,
			VOTING_BLOCK.map(() => unnamedAccounts[0]),
		);
		await env.tx({
			account: namedAccounts.deployer,
			to: BleepsDAOAccount.address,
			value: parseEther('1'),
		});

		// The DAO votes to replace itself: user 2 becomes the proposer, and the
		// current governor stops being one.
		const grantProposer = encodeFunctionData({
			abi: BleepsDAOAccount.abi,
			functionName: 'grantRole',
			args: [proposerRole, unnamedAccounts[2]],
		});
		const revokeProposer = encodeFunctionData({
			abi: BleepsDAOAccount.abi,
			functionName: 'revokeRole',
			args: [proposerRole, BleepsDAOGovernor.address],
		});

		const receipt = await propose(
			fixtures,
			unnamedAccounts[0],
			[BleepsDAOAccount.address, BleepsDAOAccount.address],
			[0n, 0n],
			[grantProposer, revokeProposer],
			'change governor',
		);
		const proposalId = getEvent(
			receipt,
			BleepsDAOGovernor.abi,
			'ProposalCreated',
		).args.proposalId as bigint;

		await passProposal(
			fixtures,
			unnamedAccounts[0],
			unnamedAccounts[1],
			proposalId,
		);

		// User 2 can now schedule directly on the timelock...
		const grantProposerToUser3 = encodeFunctionData({
			abi: BleepsDAOAccount.abi,
			functionName: 'grantRole',
			args: [proposerRole, unnamedAccounts[3]],
		});

		await env.execute(BleepsDAOAccount, {
			account: unnamedAccounts[2],
			functionName: 'schedule',
			args: [
				BleepsDAOAccount.address,
				0n,
				grantProposerToUser3,
				ZERO_BYTES32,
				ZERO_BYTES32,
				BigInt(TIMELOCK_DELAY),
			],
		});

		await networkHelpers.time.increase(TIMELOCK_DELAY);

		await env.execute(BleepsDAOAccount, {
			account: unnamedAccounts[2],
			functionName: 'execute',
			args: [
				BleepsDAOAccount.address,
				0n,
				grantProposerToUser3,
				ZERO_BYTES32,
				ZERO_BYTES32,
			],
		});

		// ...and so can user 3, who was just granted the role that way.
		await env.execute(BleepsDAOAccount, {
			account: unnamedAccounts[3],
			functionName: 'schedule',
			args: [
				BleepsDAOAccount.address,
				0n,
				grantProposerToUser3,
				ZERO_BYTES32,
				'0x0000000000000000000000000000000000000000000000000000000000000001',
				BigInt(TIMELOCK_DELAY),
			],
		});

		// The timelock itself is NOT a proposer, and the vote did not make it one.
		await expect(
			sendAsImpersonated(
				BleepsDAOAccount.address,
				BleepsDAOAccount.address,
				encodeFunctionData({
					abi: BleepsDAOAccount.abi,
					functionName: 'schedule',
					args: [
						BleepsDAOAccount.address,
						0n,
						grantProposerToUser3,
						ZERO_BYTES32,
						'0x0000000000000000000000000000000000000000000000000000000000000002',
						BigInt(TIMELOCK_DELAY),
					],
				}),
			),
		).toBeRejectedWith(
			`AccessControl: account ${BleepsDAOAccount.address.toLowerCase()} is missing role ${proposerRole}`,
		);
	});
});

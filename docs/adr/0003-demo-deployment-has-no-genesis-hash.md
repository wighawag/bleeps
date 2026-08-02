# 3. The demo (Sepolia) deployment has no recorded genesis hash

Date: 2026-08-01

Status: resolved

## Context

rocketh records the chain a deployment belongs to in `deployments/<env>/.chain`, as `{chainId, genesisHash}`. hardhat-deploy v1 recorded only `deployments/<env>/.chainId`. rocketh reads the old file as a fallback and rewrites it as `.chain` the first time it connects to that chain, taking the genesis hash from the node.

`deployments/mainnet` and `deployments/demo` still carry `.chainId`, because nothing in this migration has connected to mainnet or Sepolia; the toolchain work was all done against local chains and the committed artifacts.

That is fine for deploying and for `verify:bytecode`, but not for the web app. `rocketh-export` fills the chain object from viem's known-chain list when there is no `.chain`, and viem does not carry genesis hashes. The web app uses `chain.genesisHash` in three places, in `deployments-store.ts` and in the per-account storage key in `AccountData.ts`, so:

```
pnpm build demo
  src/lib/deployments-store.ts:154  Property 'genesisHash' does not exist ...
  src/lib/account/AccountData.ts:96 Property 'genesisHash' does not exist ...
```

`pnpm build localhost` is unaffected, because a local deploy connects and so writes `.chain`.

## Decision

Left as is rather than guessed at. The genesis hash is a fact about a chain, and writing one from memory into a deployment record is exactly the kind of plausible-looking wrong value that is worse than a missing one: `deployments-store` compares it to what the node reports and would then refuse to load a perfectly good deployment, or worse, `deleteDeploymentsIfDifferentGenesisHash` would delete it.

It is fixed by one connected command, which needs a Sepolia RPC in `contracts/.env.local`:

```
pnpm contracts:export demo      # or any command that connects
```

rocketh migrates `.chainId` to `.chain` itself, and the file should then be committed.

The same applies to `deployments/mainnet` whenever someone next connects to mainnet.

## Resolution

`deployments/demo/.chain` now records the genesis hash, read from Sepolia itself rather than recalled:

```
chainId from RPC: 11155111
genesis:          0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9
```

The chain id was checked against the `.chainId` the deployment already carried before the file was replaced, so a wrong RPC could not have quietly rewritten it.

`pnpm build demo` now succeeds.

One thing had to change for that to work at all: the credentials are stored as `ETH_NODE_URI_sepolia` / `MNEMONIC_sepolia`, under the chain's name, while the rocketh environment is called `demo`. The pre-template config bridged that explicitly (`url: node_url('sepolia')`) and the migration dropped it. `hardhat.config.ts` now aliases the two before `addNetworksFromEnv` runs, so hardhat-deploy builds the network itself rather than the config hand-rolling an http network and getting its account types wrong.

### mainnet

`deployments/mainnet/.chain` now records mainnet's genesis hash as well:

```
0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3
```

That one was NOT read from a node, because nothing here has a mainnet RPC. It came from Etherscan, and it was then checked against a second source that this repository already carries: The Graph's networks registry, vendored under `graph-cli/config/TheGraphNetworksRegistry.json`, which records the same hash for `eip155:1`. Two independent sources agreeing is the bar this file was held to, since the objection in this ADR is to writing a plausible-looking value from memory, not to writing one that has been checked.

It matters now rather than later: without it, `pnpm --filter ./web check` against a mainnet export fails on `chain.genesisHash` in `deployments-store.ts` and `AccountData.ts`, and a built bleeps.art would key its per-account storage on the string "undefined".

## Consequences

The first connected mainnet command will rewrite `.chain` from the node itself. If what it writes differs from what is committed here, that is worth stopping for: it would mean one of the two sources above is wrong about mainnet.

The account-data storage key includes the genesis hash so that per-account state does not leak between a chain and a chain that reuses its id (a reset dev chain, most obviously). Anything built before this is fixed would key on a different string afterwards, discarding local operation history for demo users once. That is acceptable for a demo and is worth knowing rather than discovering.

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

## Consequences

`deployments/mainnet` still carries `.chainId`. The same applies whenever someone next connects to mainnet; nothing depends on it today.

The account-data storage key includes the genesis hash so that per-account state does not leak between a chain and a chain that reuses its id (a reset dev chain, most obviously). Anything built before this is fixed would key on a different string afterwards, discarding local operation history for demo users once. That is acceptable for a demo and is worth knowing rather than discovering.

# 3. The demo (Sepolia) deployment has no recorded genesis hash

Date: 2026-08-01

Status: open, needs a connected run

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

## Consequences

Until then, `pnpm build demo` fails typecheck, and only the localhost path is verified end to end. The Sepolia app cannot be built from a clean checkout.

The account-data storage key includes the genesis hash so that per-account state does not leak between a chain and a chain that reuses its id (a reset dev chain, most obviously). Anything built before this is fixed would key on a different string afterwards, discarding local operation history for demo users once. That is acceptable for a demo and is worth knowing rather than discovering.

# 2. EIP-7825, the on-chain renderers, and the dev seeding

Date: 2026-08-01

Status: accepted

Supersedes an earlier draft of this ADR that claimed MeloBleeps' metadata was unreadable. That was wrong, see "What this is not" below.

## Context

Bleeps renders its own audio on chain: `tokenURI` returns a `data:application/json,` document whose `animation_url` is a base64 WAV synthesised in Solidity. MeloBleeps does the same for a 32-step melody, which is a great deal more sound to generate.

Moving to hardhat 3 changed which EVM the tests run against. Hardhat 2's predated EIP-7825, which caps a single TRANSACTION at 2^24 = 16,777,216 gas and is consensus on mainnet and Sepolia. Measured:

| call | gas |
| --- | --- |
| `Bleeps.tokenURI` | 7,531,857 |
| `MeloBleeps.tokenURI` | 34,162,981, for a 62,724-character URI |
| `Bleeps.multiMint` of all 576 to one address | 17,390,329 |
| EIP-7825 per-transaction cap | 16,777,216 |
| geth's default `--rpc.gascap` for `eth_call` | 50,000,000 |

The cap is a limit on transactions. `eth_call` is not bound by it: its gas allowance is node policy, and 34M sits comfortably inside a normal node's. EDR applies a single limit to both, configurable as `transactionGasCap`.

## Decision

**The dev seeding is batched.** `Bleeps.multiMint` of all 576 needs 17,390,329 gas, which is 3.5% over the cap, so the single call the old `003_dev` made now fails and took the whole dev deploy down with it. Seeding mints in batches of 48. (The current seeding buys through the sale instead, see ADR 0001, but the reserved instruments are still minted in bulk and the same limit applies.)

**Nothing is changed about the renderers.** Both are deployed, Bleeps on mainnet and MeloBleeps on Sepolia, and `pnpm verify:bytecode` holds them to the deployed code.

**The rendering test runs against a raised RPC gas cap**, `transactionGasCap: 50_000_000n`, which models geth's default rather than pretending the chain is old. The default connection stays faithful to consensus, so transaction-level limits are real in every other test. The test asserts the WAV output is well formed and pins the cost between the two bounds that matter: above the per-transaction cap, below a normal node's eth_call allowance. If either stops holding, that is worth being told about.

## Consequences

MeloBleeps metadata is readable by anything that reads it the normal way, over `eth_call`. Wallets, marketplaces and the web app are all fine.

What is not possible is calling `tokenURI` from inside a transaction, so no other contract can consume Bleeps or MeloBleeps metadata on chain. For a renderer this is a mild constraint rather than a defect; it is recorded so nobody designs on-chain composability around it.

An `eth_call` at 34M gas is not free of risk: providers set their own allowance and some tiers are lower than geth's default. If a provider ever refuses it, the answer is to change provider or render client-side from the `data1`/`data2`/`speed` already in the events, not to redeploy.

## What this is not

An earlier version of this ADR concluded that MeloBleeps "has metadata that most consumers cannot read" and that mainnet deployment "has to deal with this first", and the test suite carried a deliberately inverted assertion pinning the renderer as broken, plus a second connection on the `prague` hardfork to work around it.

That was a mistake, and specifically a mistake of taking a harness limitation for a property of the chain: EDR applies the transaction cap to `eth_call`, real nodes do not. The inverted test and the obsolete-hardfork connection have both been removed. The gas figures were right; the conclusion drawn from them was not.

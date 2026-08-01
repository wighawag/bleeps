# 2. MeloBleeps.tokenURI no longer fits in a transaction

Date: 2026-08-01

Status: accepted, and the underlying defect is open

## Context

Bleeps renders its own audio on chain: `tokenURI` returns a `data:application/json,` document whose `animation_url` is a base64 WAV synthesised in Solidity. MeloBleeps does the same for a 32-step melody, which is much more sound to generate.

Moving to hardhat 3 changed which EVM the tests run against. Hardhat 2's EVM predates EIP-7825, which caps a single transaction at 2^24 = 16,777,216 gas and is live on mainnet and Sepolia. Measured against a pre-cap EVM:

- `Bleeps.tokenURI` costs about 7,531,857 gas. Enormous, but under the cap.
- `MeloBleeps.tokenURI` costs about 34,162,981 gas, for a 62,724-character URI. That is more than twice the cap.

So MeloBleeps' renderer cannot be executed in a transaction on any current chain. Whether a given RPC provider will still serve it over `eth_call` varies: `eth_call` is not bound by the consensus cap, but providers impose their own limits, and hardhat's own EDR applies the cap to `eth_call` as well.

The same cap broke the dev seeding. `003_dev` used to mint all 576 Bleeps in one `multiMint`, roughly 60M gas, which worked under hardhat 2 with a 50M block gas limit and no per-transaction cap. It now runs out of gas and takes the whole dev deploy down with it.

## Decision

The seeding is fixed: `003_dev` mints in batches of 48, comfortably under the cap.

The renderer is not fixed here, because fixing it means changing `MeloBleepsTokenURI`, and that contract is deployed on Sepolia and covered by `pnpm verify:bytecode`. Instead the situation is pinned by two tests:

- `MeloBleeps > tokenURI is not callable on a current EVM` asserts that the call runs out of gas. The assertion is deliberately the wrong way round, so that fixing the renderer makes it fail and forces someone to delete it.
- `MeloBleeps rendering (pre-EIP-7825 EVM) > tokenURI renders the melody as audio` connects to a `prague` EVM so the renderer can actually run, checks that its output is a well-formed WAV data URI, and asserts that the gas it needs is over the cap.

## Consequences

MeloBleeps as currently deployed on Sepolia has metadata that most consumers cannot read. Any plan to put MeloBleeps on mainnet has to deal with this first.

The likely fixes are: render at a lower sample rate or in chunks; move the WAV assembly off chain and keep only the note data on chain; or split `tokenURI` so that the JSON and the audio can be fetched separately. Each changes the deployed contract, so each is a redeployment.

`Bleeps` is unaffected and stays fully on chain.

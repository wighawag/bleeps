# 1. The Bleeps sale is dev-only, and dev reproduces its outcome

Date: 2026-08-01

Status: accepted

## Context

All 576 Bleeps were sold on mainnet in 2021 through `BleepsFixedPriceSale`, deployed as `BleepsInitialSale` and gated by merkle sale passes issued to Mandala holders. That sale is over and will never run again on mainnet. The MeloBleeps sale has not happened at all yet, and when it does it will be creator-driven rather than a fixed-price drop, so nothing about the old sale contracts describes it either.

At the same time a local chain with no Bleeps minted is not a usable version of this project. The grid is empty, the DAO has zero total supply so no proposal can meet the threshold, and the treasury is empty so no proposal has anything to spend. Almost everything the app and the contracts do depends on Bleeps being owned by somebody.

The previous arrangement expressed this through hardhat-deploy v1's per-network `deploy:` arrays: `devDeploy` included the mocks and the seeding, `productionDeploy` did not. rocketh has no direct equivalent to a per-network deploy list keyed off the hardhat network config, and a `--tags` flag would have to be remembered on every invocation.

## Decision

The sale contracts stay in `src/`, and a sale IS deployed, but only where the deploy script list says so.

Which scripts run where is declared in `rocketh/config.ts` as four named lists, and the environment picks one:

- `productionScripts`: Bleeps, the DAO, MeloBleeps. This is also the TOP-LEVEL default, so an environment nobody configured gets the safe list rather than a dev one. No sale.
- `devScripts`: the above plus `000_externals` (the WETH and OpenSea proxy mocks), `003_dev_sale` and `004_dev_seed`. Used by `localhost` and by `demo` (Sepolia).
- `saleTestScripts`: the sale, deployed but untouched, for the sale tests.
- `testScripts`: no sale and no seeding, because most tests need an unminted contract with the minter role still free.

Crucially the dev chain reaches its state THROUGH the sale rather than by minting into place. `004_dev_seed` has the creator take the two reserved instruments (7 and 8, 128 Bleeps, via `creatorMultiMint`) and the rest are bought. So the DAO treasury holds real proceeds and the creator holds its real 25%, rather than either being invented.

How much is bought is the dev sale's MODE, see the revision below.

The pass keys are DERIVED, not random: `devSalePassPrivateKey(i) = keccak256(encodePacked('bleeps dev sale pass', i))`. They are therefore public, which is fine and in fact wanted for a dev replay, and it means the sale is reproducible from the repository alone. The original script generated random keys and persisted them to a dotfile beside the deployment, so a sale could not be rebuilt without that file. This must never be used for a real sale.

## Revision: sold out by default, a live sale on request

Date: 2026-08-01

The seeding originally left about 398 Bleeps unsold, so a dev chain always sat in the middle of a live sale. That is the wrong default. The thing a dev chain should reproduce is what bleeps.art IS, which is sold out: 576 owned, a DAO holding the proceeds, and an app that browses rather than sells. A live sale is the exception, so it is now the thing you opt into:

```
BLEEPS_DEV_SALE=live pnpm contracts:deploy localhost
```

The mode is decided when the SALE is deployed, not when the seeding runs, because it changes the sale's times and those are constructor immutables (`deploy/dev-sale-mode.ts`):

- sold out: the whitelist window is already over when the sale is deployed, so the seeding can buy the remaining 448 through the public phase. A pass-gated sell-out is not possible in the first place, since there are about eighty passes and 448 Bleeps.
- live: the whitelist window opens at deploy time and runs for an hour. Every dev account redeems the pass bound to its address, half the transferable passes are redeemed, and the rest are left to buy by hand, which is what the original seeding did.

The seeding reads the DEPLOYED sale's own times rather than the environment variable, so a seeding run cannot contradict the sale it is seeding.

**The web app is told none of this.** It works out its own mode from two facts: is a sale deployed at all, and does it still have something to sell (`web/src/lib/sale/mode.ts`). Mainnet has a spent sale contract and no unsold Bleeps, so it browses; a dev chain with a live sale mints; and the moment the last Bleep goes, wherever that happens, the app follows. There is no flag to set and none to forget, and the state cannot be described wrongly because it is not described at all.

One consequence worth knowing: selling out costs 448 purchases at 0.1 ETH each. On a local chain that is free and takes seconds. On a funded network it is 44.8 ETH of that network's ether, so `demo` on Sepolia wants `BLEEPS_DEV_SALE=live` unless somebody is feeling rich.

`test/DevSeed.test.ts` pins both end states against the real deploy scripts.

## Consequences

Forgetting a flag cannot deploy a sale contract to a live chain; you would have to add the script to that environment's list by name.

`demo` on Sepolia counts as dev. It gets the mocks and the seeded distribution, which is what makes it a demo.

The sale went from no coverage to eleven tests. `test/.Bleeps.sale.test.ts` had been disabled (renamed to a dotfile) in commit 357cb96 when the sale deploy script was removed, and had a single test that only checked one happy path. The replacement covers both pass mechanisms, pass reuse, presenting somebody else's pass, the signature being bound to its recipient rather than its sender, the 25/75 split with nothing stranded in the sale contract, over- and underpayment, the reserved instruments, and the transition to the passless public phase.

Because the sale holds the minter role on a dev chain, nothing else can mint there. That is why `testScripts` exists: the other tests appoint themselves minter, which would fight with a deployed sale.

The old `003_dev` scripts are gone. Minting all 576 Bleeps directly and transferring a round 33 ETH to the treasury is strictly worse than running the sale: it left nothing to buy, and the treasury figure was invented.

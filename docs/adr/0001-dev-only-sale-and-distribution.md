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

Crucially the dev chain reaches its state THROUGH the sale rather than by minting into place. `004_dev_seed` has the creator take the two reserved instruments (7 and 8, 128 Bleeps, via `creatorMultiMint`), then buys about fifty more by actually redeeming passes. So the DAO treasury holds real proceeds, the creator holds its real 25%, the pass bitmask has genuinely spent passes in it, and roughly 398 Bleeps are left purchasable so the buying flow is still reachable after the deploy. Half the transferable passes are left unredeemed for the same reason.

The pass keys are DERIVED, not random: `devSalePassPrivateKey(i) = keccak256(encodePacked('bleeps dev sale pass', i))`. They are therefore public, which is fine and in fact wanted for a dev replay, and it means the sale is reproducible from the repository alone. The original script generated random keys and persisted them to a dotfile beside the deployment, so a sale could not be rebuilt without that file. This must never be used for a real sale.

## Consequences

Forgetting a flag cannot deploy a sale contract to a live chain; you would have to add the script to that environment's list by name.

`demo` on Sepolia counts as dev. It gets the mocks and the seeded distribution, which is what makes it a demo.

The sale went from no coverage to eleven tests. `test/.Bleeps.sale.test.ts` had been disabled (renamed to a dotfile) in commit 357cb96 when the sale deploy script was removed, and had a single test that only checked one happy path. The replacement covers both pass mechanisms, pass reuse, presenting somebody else's pass, the signature being bound to its recipient rather than its sender, the 25/75 split with nothing stranded in the sale contract, over- and underpayment, the reserved instruments, and the transition to the passless public phase.

Because the sale holds the minter role on a dev chain, nothing else can mint there. That is why `testScripts` exists: the other tests appoint themselves minter, which would fight with a deployed sale.

The old `003_dev` scripts are gone. Minting all 576 Bleeps directly and transferring a round 33 ETH to the treasury is strictly worse than running the sale: it left nothing to buy, and the treasury figure was invented.

# 1. The Bleeps sale is dev-only, and dev reproduces its outcome

Date: 2026-08-01

Status: accepted

## Context

All 576 Bleeps were sold on mainnet in 2021 through `BleepsFixedPriceSale`, deployed as `BleepsInitialSale` and gated by merkle sale passes issued to Mandala holders. That sale is over and will never run again on mainnet. The MeloBleeps sale has not happened at all yet, and when it does it will be creator-driven rather than a fixed-price drop, so nothing about the old sale contracts describes it either.

At the same time a local chain with no Bleeps minted is not a usable version of this project. The grid is empty, the DAO has zero total supply so no proposal can meet the threshold, and the treasury is empty so no proposal has anything to spend. Almost everything the app and the contracts do depends on Bleeps being owned by somebody.

The previous arrangement expressed this through hardhat-deploy v1's per-network `deploy:` arrays: `devDeploy` included the mocks and the seeding, `productionDeploy` did not. rocketh has no direct equivalent to a per-network deploy list keyed off the hardhat network config, and a `--tags` flag would have to be remembered on every invocation.

## Decision

The sale contracts stay in `src/`, compiled and available, but no deploy script deploys one.

Which scripts run where is declared in `rocketh/config.ts` as three named lists, and the environment picks one:

- `productionScripts`: Bleeps, the DAO, MeloBleeps. This is also the TOP-LEVEL default, so an environment nobody configured gets the safe list rather than the dev one.
- `devScripts`: the above plus `000_externals` (the WETH and OpenSea proxy mocks) and `003_dev`. Used by `localhost` and by `demo` (Sepolia).
- `testScripts`: `devScripts` without `003_dev`, because the tests need an unminted contract to mint from.

`003_dev` does not simulate the sale. It reproduces its OUTCOME: it mints all 576 Bleeps to the dev accounts and puts 33 ETH in the treasury, which is the state mainnet is actually in. The first two unnamed accounts are deliberately left with nothing, so the "you own no Bleeps" paths stay reachable.

## Consequences

Forgetting a flag cannot deploy a sale contract to a live chain; you would have to add the script to that environment's list by name.

`demo` on Sepolia counts as dev. It gets the mocks and the seeded distribution, which is what makes it a demo.

There is currently no test coverage of the sale contracts. `test/.Bleeps.sale.test.ts` had already been disabled (by renaming it to a dotfile) in commit 357cb96, when the sale deploy script was removed; it depended on a `BleepsInitialSale` deployment carrying the pass leaves and private keys in its `linkedData`, and no such deployment is produced any more. It has been deleted rather than left looking runnable.

Restoring a playable sale on dev, which is wanted, therefore means writing a new dev-only deploy script that generates the pass keys, builds the merkle tree, deploys `BleepsFixedPriceSale` and appoints it minter, and porting the test alongside it. That is a separate piece of work, not covered here.

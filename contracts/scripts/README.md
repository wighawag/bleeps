# scripts

`verify-deployed-bytecode.ts` proves the current toolchain still compiles to the code that is live on chain. Run it with `pnpm verify:bytecode`, and treat a failure as a blocker rather than something to update: the mainnet Bleeps, its tokenURI renderer and the DAO cannot be redeployed.

## What used to be here

A set of operational one-offs, all written against ethers v5, hardhat-deploy v1 and the generated `typechain` directory: `mintBleeps`, `mintCreatorBleeps`, `seed`, `extractETHFromDAO`, `fundingFromCoinbase`, `setMessage`, `tokenURI`, `contractURI`, `tokenIdsForInstrument`, `exportPrivateKeysAsPassURL`, `booking-test`, and a `queries/` directory that pulled owner lists from the subgraph.

None of them survive the move to hardhat 3, viem and rocketh, and none were referenced by any package script, so they were removed rather than left to look runnable. They are in the git history if one is needed again; port it against `rocketh/environment.ts` and run it with `pnpm execute <file>`.

Two of their outputs are kept, because they are data rather than code: `bleepsOwners_at_13757382.json` (mainnet Bleeps owners at the block the DAO migration was prepared against) and `mandalaOwners.json` (the Mandala holders the original sale passes were issued to).

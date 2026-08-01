# 4. The melody index is a seam, not a subgraph

Date: 2026-08-01

Status: accepted

## Context

Melodies have to be listed: which exist, who composed them, who owns them. That is indexing work, and today the project has a subgraph for it. The intention is to replace it with our own indexer.

The pre-template app did not treat this as replaceable. `@urql/core` and GraphQL query strings were spread through `lib/stores/melodies.ts`, `lib/utils/stores/graphql.ts` and the components, so the subgraph's response shape reached the UI: components consumed `data1`, `data2`, `reserveTimestamp` as a decimal string, and `owner: {id}`. Swapping the backend would have meant touching every one of them.

## Decision

Everything the app knows about melody indexing is `lib/melodies/index/`:

- `types.ts` defines `MelodyIndex`, one method, `list(query)`, and `IndexedMelody`, which is the APP's shape: ids as strings, timestamps in milliseconds, and the melody already decoded into slots so no consumer touches `data1`/`data2`.
- `subgraph.ts` is the only file in the app containing GraphQL.
- `index.ts` picks the implementation.

Replacing the subgraph is: write a second file implementing `MelodyIndex`, change what `createMelodyIndex` returns. No page, component or store changes.

The list is polled rather than subscribed, because polling is the one thing every backend can do. A push channel is the obvious thing to add when our own indexer has one, and `routes/melodies/lib/list.ts` is where it lands.

`PUBLIC_SUBGRAPH_URL` empty means no index: the melody list says so, and everything else, including composing, previewing and minting, works. An indexer is a convenience for browsing, not a dependency of the app.

## Consequences

The index is authoritative for what exists but always lags. A melody just minted is not in it yet, so `viewState` carries `pendingMelodies`, derived from this user's in-flight operations, and the list renders those first and greyed. An operation stops counting as pending the moment it is included, successful or not, because from then on the index is the source of truth and counting both would show the melody twice.

Filtering is by `owner` and `creator` only. Anything richer belongs in the new indexer rather than being bolted onto this one.

## Not verified

The live round trip is NOT confirmed. The adapter has unit tests against recorded response shapes, and `pnpm subgraph:deploy:local` builds, uploads to IPFS and is accepted by graph-node, but graph-node never indexed a block, so no query has ever returned a real melody.

The cause is that the dev chain is not reachable from the container: graph-node logs `Connection refused` for `http://host.docker.internal:8546`, and `ss` shows hardhat listening on `127.0.0.1:8546`. `hardhat node --hostname 0.0.0.0` is documented and accepted but the socket still binds loopback, so `contracts/package.json`'s `node:local` now passes it and it appears not to take effect. That needs to be run down before the melody list can be trusted, and it is a prerequisite for `pnpm start` to work as a whole, since the zellij layout starts both.

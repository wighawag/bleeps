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

## Not verified, and why

The live round trip is NOT confirmed. The adapter has unit tests against recorded response shapes, and `pnpm subgraph:deploy:local` builds, uploads to IPFS and is accepted by graph-node, but graph-node never indexed a block, so no query has ever returned a real melody.

graph-node logs `Connection refused` for `http://host.docker.internal:8546`. Two separate things caused that, and an earlier version of this ADR blamed the wrong one.

First, the dev node bound loopback. `node:local` now passes `--hostname 0.0.0.0`, and that works: `ss` confirms `LISTEN 0.0.0.0:8546`. An earlier note here claimed the flag had no effect; that was a bad test, in which a second node crashed on stale build info while the first still held the port, so `ss` was reporting the original process. The flag is fine.

Second, and this is the actual blocker, **the host has IPv4 forwarding disabled**:

```
$ sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 0
```

so no container can route to the host gateway at all. Any container gets `WARNING: IPv4 forwarding is disabled. Networking will not work.` Host to container works, which is why `subgraph_create` and `subgraph_deploy` are accepted, but container to host does not, so graph-node can never read the chain.

This is machine configuration, not repository configuration. Enabling it (`sudo sysctl -w net.ipv4.ip_forward=1`, and persisting it in `/etc/sysctl.d/`) is a decision for whoever owns the machine, so nothing here tries to work around it.

Once forwarding is on, the remaining `ECONNRESET` seen by the deploy CLI should be re-checked before being treated as a separate problem: graph-node was thrashing on an unreachable chain throughout, and the CLI retry loop that produced repeated `subgraph_create` / `subgraph_deploy` pairs is consistent with that.

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

That state is a deployment we actually ship, not just a developer's half-configured checkout, so it is its own result step. `Unavailable` is a build with no index at all, which is permanent until one is configured and is rendered as muted text; `Failed` is an index that exists and did not answer, which is rendered as an error. Collapsing the two would tell a visitor to demo.bleeps.art that something is broken when nothing is. The `Unavailable` message names `PUBLIC_SUBGRAPH_URL` only under `dev`, because in production the reader is a visitor who cannot set it and wants to know what still works.

## Consequences

The index is authoritative for what exists but always lags. A melody just minted is not in it yet, so `viewState` carries `pendingMelodies`, derived from this user's in-flight operations, and the list renders those first and greyed. An operation stops counting as pending the moment it is included, successful or not, because from then on the index is the source of truth and counting both would show the melody twice.

Filtering is by `owner` and `creator` only. Anything richer belongs in the new indexer rather than being bolted onto this one.

## Verified

The full round trip now works, on a local chain with the subgraph running:

```
subgraph: bleepsSummaries -> numTokens 178, numOwners 19   (exactly the dev seed)
minted a melody:            reserveAndMint, block 135
index.list():               id=1 minted=true revealed=true name="indexed tune" speed=16
                            decoded slots: n12/i2/v5  n30/i5/v7   (what was sent)
```

Getting there took two wrong diagnoses of mine and one real one.

Wrong: I said `hardhat node --hostname 0.0.0.0` had no effect. It works; my test had a second node crashing on stale build info while the first held the port.

Wrong: I said the blocker was the host's `net.ipv4.ip_forward=0`. It is 1 now and nothing changed.

Right: **Docker here is rootless.** A rootless container sits in its own network namespace with its own disabled forwarding, so the host's sysctl is irrelevant and `host.docker.internal`, `172.17.0.1` and slirp4netns' `10.0.2.2` are all unreachable. `--network host` is reachable, because for rootless Docker that namespace is the user's own, which is where the dev chain runs.

So `dev/docker-compose-subgraph.yml` puts graph-node on `network_mode: host` and reaches the chain, ipfs and postgres over `127.0.0.1`. That works under both rootless and rootful Docker and avoids moving the dev chain into the compose file. The `ECONNRESET` from the deploy CLI was indeed downstream: it has not recurred.

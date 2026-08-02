# 5. A Bleep's sound comes from the contract, and a click is what asks for it

Date: 2026-08-01

Status: accepted

## Context

The grid at `/bleeps` draws 576 tiles. Everything on a tile (its colour, note, instrument, frequency) is arithmetic on the token id, so the grid renders without touching the chain. The SOUND is not: `Bleeps.tokenURI` synthesises a WAV in Solidity and costs about 7,531,857 gas, which is fine over `eth_call` and impossible in a transaction (see ADR 2). Measured against the local node it returns in well under a second; against a busy public RPC it is a noticeable wait.

That rules some things out. Playing on hover would fire hundreds of 7.5M-gas calls while a pointer crosses the grid, and the sound would arrive after the pointer had left. Prefetching the grid would be 576 of them.

There is a second way to make the sound: write the synthesiser again in JavaScript. It is not much code, it is instant, and it is a fork of the definition of what a Bleep sounds like.

## Decision

**A click asks for a Bleep's sound; nothing else does.** One deliberate act, one call, and a loading state on the tile while the contract renders, because there is a real wait and a tile that did nothing looks broken. The tile's equaliser then animates for as long as the sound plays, so the thing you hear and the thing you clicked are visibly the same thing.

**Rendered sounds are cached for the life of the page** (`lib/bleeps/sound.ts`), keyed by chain, contract and id. A Bleep's WAV is a pure function of its id, so the second play is immediate. Concurrent clicks on one tile share a single call, and a failed call is not cached, so a retry is a retry.

**One Bleep plays at a time** (`lib/bleeps/player.ts`). A second click stops the first, including while the first is still being rendered: the later request wins, or a slow render would start playing unasked after the user had moved on.

**No JavaScript synthesiser.** Not yet, and not without a test. The Solidity renderer is the definition of a Bleep, it is deployed and unchangeable, and a second implementation is a second definition that will drift from it. If one is written, it needs a test that renders the same ids both ways and asserts the bytes match, run against the deployed contract rather than against a copy of the intent.

## Consequences

The first play of any Bleep waits on an `eth_call`. That is visible, and it is why the page says "Click a Bleep to hear it" rather than pretending the grid is an instrument.

An app with no RPC of its own cannot play anything until a wallet is connected, the same as every other chain read here.

The `/bleeps/[id]` page shares the cache, so opening the page for a Bleep you just heard costs nothing.

If a provider ever refuses a 7.5M-gas `eth_call`, the answer is the one in ADR 2: change provider, or render client-side from what the contract already exposes, and at that point the differential test above stops being optional.

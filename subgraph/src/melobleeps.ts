/* eslint-disable */
import {MelodyReserved, MelodyRevealed, Transfer} from '../generated/MeloBleeps/MeloBleepsContract';
import {Account, Melody} from '../generated/schema';
import {getMelody} from './melodyUtils';
import {handleAccountViaId, handleMelodiesSummary, ONE, ZERO, ZERO_ADDRESS} from './shared';

export function handleTransfer(event: Transfer): void {
  let melodiesSummary = handleMelodiesSummary();
  let melody = getMelody(event.params.tokenId);
  melodiesSummary.numTransfers = melodiesSummary.numTransfers.plus(ONE);

  let to = event.params.to.toHexString();
  let from = event.params.from.toHexString();

  let ownerFrom: Account;
  let ownerTo: Account;
  if (event.params.from == ZERO_ADDRESS) {
    ownerTo = handleAccountViaId(to);
    melody.owner = ownerTo.id;
    melody.mintTimestamp = event.block.timestamp;
    melody.minted = true;
    if (ownerTo.numMelodies.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.plus(ONE);
    }
    ownerTo.numMelodies = ownerTo.numMelodies.plus(ONE);

    ownerTo.save();

    melodiesSummary.numTokens = melodiesSummary.numTokens.plus(ONE);
    melodiesSummary.numToMint = melodiesSummary.numToMint.minus(ONE);
  } else if (event.params.to == ZERO_ADDRESS) {
    // bleeps CANNOT GO TO ZERO ADDRESSS
    // bleep.owner = null;

    ownerFrom = handleAccountViaId(from);
    ownerFrom.numMelodies = ownerFrom.numMelodies.minus(ONE);
    if (ownerFrom.numMelodies.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.minus(ONE);
    }
    ownerFrom.save();
    melodiesSummary.numTokens = melodiesSummary.numTokens.minus(ONE);
  } else {
    ownerTo = handleAccountViaId(to);
    melody.owner = ownerTo.id;

    if (ownerTo.numMelodies.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.plus(ONE);
    }

    ownerTo.numMelodies = ownerTo.numMelodies.plus(ONE);
    ownerTo.save();

    ownerFrom = handleAccountViaId(from);

    ownerFrom.numMelodies = ownerFrom.numMelodies.minus(ONE);
    ownerFrom.save();

    if (ownerFrom.numMelodies.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.minus(ONE);
    }
  }

  melody.save();
  melodiesSummary.save();
}

export function handleMelodyReserved(event: MelodyReserved): void {
  let melodiesSummary = handleMelodiesSummary();
  let melody = getMelody(event.params.id);

  melodiesSummary.numReserved = melodiesSummary.numReserved.plus(ONE);
  melodiesSummary.numToReveal = melodiesSummary.numToReveal.plus(ONE);

  let artistAddress = event.params.artist.toHexString();
  handleAccountViaId(artistAddress);
  melody.creator = artistAddress;
  melody.nameHash = event.params.nameHash;
  melody.melodyHash = event.params.melodyHash;
  melody.reserveTimestamp = event.block.timestamp;
  melody.revealed = false;
  melody.minted = false;

  melody.save();
  melodiesSummary.save();
}

export function handleMelodyRevealed(event: MelodyRevealed): void {
  let melodiesSummary = handleMelodiesSummary();
  let melody = getMelody(event.params.id);
  melody.name = event.params.name;
  melody.data1 = event.params.data1;
  melody.data2 = event.params.data2;
  melody.speed = event.params.speed;
  melody.revealTimestamp = event.block.timestamp;
  melody.revealed = true;

  melodiesSummary.numRevealed = melodiesSummary.numRevealed.plus(ONE);
  melodiesSummary.numToReveal = melodiesSummary.numToReveal.minus(ONE);
  melodiesSummary.numToMint = melodiesSummary.numToMint.plus(ONE);

  melody.save();
  melodiesSummary.save();
}

/* eslint-disable */
import {Transfer} from '../generated/MeloBleeps/MeloBleepsContract';
import {Account, Melody} from '../generated/schema';
import {handleMelody} from './melodyUtils';
import {handleAccountViaId, handleMelodiesSummary, ONE, ZERO, ZERO_ADDRESS} from './shared';

export function handleTransfer(event: Transfer): void {
  let melodiesSummary = handleMelodiesSummary();
  let melody = handleMelody(event.params.tokenId);
  melodiesSummary.numTransfers = melodiesSummary.numTransfers.plus(ONE);

  let to = event.params.to.toHexString();
  let from = event.params.from.toHexString();

  let ownerFrom: Account;
  let ownerTo: Account;
  if (event.params.from == ZERO_ADDRESS) {
    ownerTo = handleAccountViaId(to);
    melody.owner = ownerTo.id;
    if (ownerTo.numBleeps.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.plus(ONE);
    }
    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);

    ownerTo.save();

    melodiesSummary.numTokens = melodiesSummary.numTokens.plus(ONE);
  } else if (event.params.to == ZERO_ADDRESS) {
    // bleeps CANNOT GO TO ZERO ADDRESSS
    // bleep.owner = null;

    ownerFrom = handleAccountViaId(from);
    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    if (ownerFrom.numBleeps.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.minus(ONE);
    }
    ownerFrom.save();
    melodiesSummary.numTokens = melodiesSummary.numTokens.minus(ONE);
  } else {
    ownerTo = handleAccountViaId(to);
    melody.owner = ownerTo.id;

    if (ownerTo.numBleeps.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.plus(ONE);
    }

    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);
    ownerTo.save();

    ownerFrom = handleAccountViaId(from);

    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    ownerFrom.save();

    if (ownerFrom.numBleeps.equals(ZERO)) {
      melodiesSummary.numOwners = melodiesSummary.numOwners.minus(ONE);
    }
  }

  melody.save();
  melodiesSummary.save();
}

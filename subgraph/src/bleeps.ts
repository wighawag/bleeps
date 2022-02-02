/* eslint-disable */
import {BigInt, Address, ethereum} from '@graphprotocol/graph-ts';
import {Transfer} from '../generated/Bleeps/BleepsContract';
import {Bleep, Account} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

import {handleBleepsSummary, handleAccountViaId, ZERO, ZERO_ADDRESS, ONE} from './shared';

function handleBleep(id: BigInt): Bleep {
  let bleepId = id.toString();
  let entity = Bleep.load(bleepId);

  if (!entity) {
    entity = new Bleep(bleepId);
  }
  return entity as Bleep;
}

export function handleTransfer(event: Transfer): void {
  let bleepsSummary = handleBleepsSummary();
  let bleep = handleBleep(event.params.tokenId);
  bleepsSummary.numTransfers = bleepsSummary.numTransfers.plus(ONE);

  let to = event.params.to.toHexString();
  let from = event.params.from.toHexString();

  let ownerFrom: Account;
  let ownerTo: Account;
  if (event.params.from == ZERO_ADDRESS) {
    ownerTo = handleAccountViaId(to);
    bleep.owner = ownerTo.id;
    if (ownerTo.numBleeps.equals(ZERO)) {
      bleepsSummary.numOwners = bleepsSummary.numOwners.plus(ONE);
    }
    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);

    ownerTo.save();

    bleepsSummary.numTokens = bleepsSummary.numTokens.plus(ONE);
  } else if (event.params.to == ZERO_ADDRESS) {
    // bleeps CANNOT GO TO ZERO ADDRESSS
    // bleep.owner = null;

    ownerFrom = handleAccountViaId(from);
    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    if (ownerFrom.numBleeps.equals(ZERO)) {
      bleepsSummary.numOwners = bleepsSummary.numOwners.minus(ONE);
    }
    ownerFrom.save();
    bleepsSummary.numTokens = bleepsSummary.numTokens.minus(ONE);
  } else {
    ownerTo = handleAccountViaId(to);
    bleep.owner = ownerTo.id;

    if (ownerTo.numBleeps.equals(ZERO)) {
      bleepsSummary.numOwners = bleepsSummary.numOwners.plus(ONE);
    }

    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);
    ownerTo.save();

    ownerFrom = handleAccountViaId(from);

    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    ownerFrom.save();

    if (ownerFrom.numBleeps.equals(ZERO)) {
      bleepsSummary.numOwners = bleepsSummary.numOwners.minus(ONE);
    }
  }

  bleep.save();
  bleepsSummary.save();
}

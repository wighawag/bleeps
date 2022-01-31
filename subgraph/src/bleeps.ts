/* eslint-disable */
import {BigInt, Address, ethereum} from '@graphprotocol/graph-ts';
import {Transfer} from '../generated/Bleeps/BleepsContract';
import {Bleep, Owner} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

import {handleAll, handleOwnerViaId, ZERO, ZERO_ADDRESS, ONE, toEventId} from './shared';

function handleBleep(id: BigInt, minter: Address): Bleep {
  let bleepId = id.toString();
  let entity = Bleep.load(bleepId);

  if (!entity) {
    entity = new Bleep(bleepId);
    entity.minter = minter.toHexString();
  }
  return entity as Bleep;
}

export function handleTransfer(event: Transfer): void {
  let all = handleAll();
  let minter = handleOwnerViaId(event.transaction.from.toHexString());
  if (minter.numBleepsMinted.equals(ZERO)) {
    all.numMinters = all.numMinters.plus(ONE);
  }
  minter.numBleepsMinted = minter.numBleepsMinted.plus(ONE);
  minter.save();

  let bleep = handleBleep(event.params.tokenId, event.transaction.from);

  all.numTransfers = all.numTransfers.plus(ONE);

  let to = event.params.to.toHexString();
  let from = event.params.from.toHexString();

  let ownerFrom: Owner;
  let ownerTo: Owner;
  if (event.params.from == ZERO_ADDRESS) {
    ownerTo = handleOwnerViaId(to);
    bleep.owner = ownerTo.id;
    if (ownerTo.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.plus(ONE);
    }
    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);

    ownerTo.save();

    all.numBleeps = all.numBleeps.plus(ONE);
  } else if (event.params.to == ZERO_ADDRESS) {
    // bleeps CANNOT GO TO ZERO ADDRESSS
    // bleep.owner = null;

    ownerFrom = handleOwnerViaId(from);
    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    if (ownerFrom.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.minus(ONE);
    }
    ownerFrom.save();
    all.numBleeps = all.numBleeps.minus(ONE);
  } else {
    ownerTo = handleOwnerViaId(to);
    bleep.owner = ownerTo.id;

    if (ownerTo.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.plus(ONE);
    }

    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);
    ownerTo.save();

    ownerFrom = handleOwnerViaId(from);

    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    ownerFrom.save();

    if (ownerFrom.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.minus(ONE);
    }
  }

  bleep.save();
  all.save();
}

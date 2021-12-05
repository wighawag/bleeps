/* eslint-disable */
import {Bytes, ByteArray, BigInt, Address} from '@graphprotocol/graph-ts';
import {Transfer} from '../generated/Bleeps/BleepsContract';
import {All, Bleep, Owner} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);

function handleOwnerViaId(id: string): Owner {
  let entity = Owner.load(id);
  if (entity) {
    return entity as Owner;
  }
  entity = new Owner(id);
  entity.numBleeps = ZERO;
  entity.numBleepsMinted = ZERO;
  entity.save();
  return entity as Owner;
}

function handleAll(): All {
  let all = All.load('all');
  if (!all) {
    all = new All('all');
    all.numBleeps = ZERO;
    all.numMinters = ZERO;
    all.numOwners = ZERO;
  }
  return all as All;
}

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
  let bleep = handleBleep(event.params.tokenId, event.transaction.from);

  let to = event.params.to.toHexString();
  let from = event.params.from.toHexString();
  if (event.params.from == ZERO_ADDRESS) {
    bleep.owner = event.params.to.toHexString();

    let owner = handleOwnerViaId(to);
    if (owner.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.plus(ONE);
    }
    owner.numBleeps = owner.numBleeps.plus(ONE);
    owner.save();
  } else if (event.params.to == ZERO_ADDRESS) {
    // bleep.owner = null; // keep so it is handled in handleBurned

    let owner = handleOwnerViaId(from);
    owner.numBleeps = owner.numBleeps.minus(ONE);
    if (owner.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.minus(ONE);
    }
    owner.save();
  } else {
    let ownerTo = handleOwnerViaId(to);

    if (ownerTo.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.plus(ONE);
    }

    ownerTo.numBleeps = ownerTo.numBleeps.plus(ONE);
    ownerTo.save();

    let ownerFrom = handleOwnerViaId(from);
    ownerFrom.numBleeps = ownerFrom.numBleeps.minus(ONE);
    ownerFrom.save();

    if (ownerFrom.numBleeps.equals(ZERO)) {
      all.numOwners = all.numOwners.minus(ONE);
    }
  }
  bleep.save();
  all.save();
}

// export function handleMinted(event: Minted): void {
//   let all = handleAll();
//   all.numBleeps = all.numBleeps.plus(ONE);
//   all.numBleepsMinted = all.numBleepsMinted.plus(ONE);

//   let bleep = handleBleep(event.params.id, event.transaction.from);
//   bleep.numSpent = bleep.numSpent.plus(event.params.pricePaid);
//   bleep.save();

//   let owner = handleOwnerViaId(bleep.minter);
//   if (owner.numBleepsMinted.equals(ZERO)) {
//     all.numMinters = all.numMinters.plus(ONE);
//   }
//   owner.numSpent = owner.numSpent.plus(event.params.pricePaid);
//   owner.numBleepsMinted = owner.numBleepsMinted.plus(ONE);
//   owner.save();

//   all.numSpent = all.numSpent.plus(event.params.pricePaid);

//   all.save();
// }

// export function handleBurned(event: Burned): void {
//   let all = handleAll();
//   all.numBleeps = all.numBleeps.minus(ONE);
//   let bleep = Bleep.load(event.params.id.toString());

//   let owner = handleOwnerViaId(bleep.owner);
//   owner.numCollected = owner.numCollected.plus(event.params.priceReceived);
//   owner.save();

//   bleep.owner = null;
//   bleep.numCollected = bleep.numCollected.plus(event.params.priceReceived);
//   bleep.save();

//   all.numCollected = all.numCollected.plus(event.params.priceReceived);

//   all.save();
// }

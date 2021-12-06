/* eslint-disable */
import {Bytes, ByteArray, BigInt, Address, ethereum} from '@graphprotocol/graph-ts';
import {Transfer} from '../generated/Bleeps/BleepsContract';
import {All, Bleep, Owner, TransferEvent, Transaction} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);

function toEventId(event: ethereum.Event): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString());
}

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
    all.numTransfers = ZERO;
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

function handleTransaction(event: ethereum.Event): string {
  let transactionId = event.transaction.hash.toHex();
  let transaction = Transaction.load(transactionId);
  if (transaction == null) {
    transaction = new Transaction(transactionId);
    transaction.to = event.transaction.to.toHexString();
    transaction.from = event.transaction.from.toHexString();
    transaction.save();
  }

  return transactionId;
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

  let transactionId = handleTransaction(event);
  let transferEvent = new TransferEvent(toEventId(event));
  transferEvent.blockNumber = event.block.number.toI32();
  transferEvent.timestamp = event.block.timestamp;
  transferEvent.transaction = transactionId;
  transferEvent.bleep = bleep.id;
  if (ownerFrom) {
    transferEvent.from = ownerFrom.id;
  }
  if (ownerTo) {
    transferEvent.to = ownerTo.id;
  }
  transferEvent.save();

  bleep.save();
  all.save();
}

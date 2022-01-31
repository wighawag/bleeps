/* eslint-disable */
import {Bytes, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {All, Owner} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

export let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function toEventId(event: ethereum.Event): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString());
}

export function handleOwnerViaId(id: string): Owner {
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

export function handleAll(): All {
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

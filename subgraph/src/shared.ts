/* eslint-disable */
import {Bytes, BigInt, ethereum} from '@graphprotocol/graph-ts';
import {BleepsSummary, Account, MelodiesSummary} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

export let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function toEventId(event: ethereum.Event): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString());
}

export function handleAccountViaId(id: string): Account {
  let entity = Account.load(id);
  if (entity) {
    return entity as Account;
  }
  entity = new Account(id);
  entity.numBleeps = ZERO;
  entity.save();
  return entity as Account;
}

export function handleBleepsSummary(): BleepsSummary {
  let summary = BleepsSummary.load('bleepsSummary');
  if (!summary) {
    summary = new BleepsSummary('bleepsSummary');
    summary.numTokens = ZERO;
    summary.numOwners = ZERO;
    summary.numTransfers = ZERO;
  }
  return summary as BleepsSummary;
}

export function handleMelodiesSummary(): MelodiesSummary {
  let summary = MelodiesSummary.load('melodiesSummary');
  if (!summary) {
    summary = new MelodiesSummary('melodiesSummary');
    summary.numTokens = ZERO;
    summary.numCreators = ZERO;
    summary.numOwners = ZERO;
    summary.numTransfers = ZERO;
  }
  return summary as MelodiesSummary;
}

// export function handleAll(): All {
//   let all = All.load('All');
//   if (!all) {
//     all = new All('All');
//     all.numTokens = ZERO;
//     all.numMinters = ZERO;
//     all.numOwners = ZERO;
//     all.numTransfers = ZERO;
//   }
//   return all as All;
// }

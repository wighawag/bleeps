/* eslint-disable */
import {Bytes, BigInt} from '@graphprotocol/graph-ts';
import {Melody} from '../generated/schema';
// import {log} from '@graphprotocol/graph-ts';

export let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function getMelody(id: BigInt): Melody {
  let melodyID = id.toString();
  let entity = Melody.load(melodyID);

  if (!entity) {
    entity = new Melody(melodyID);
  }
  return entity as Melody;
}

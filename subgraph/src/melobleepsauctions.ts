/* eslint-disable */
import {BigInt} from '@graphprotocol/graph-ts';
import {AuctionSetup} from '../generated/MeloBleepsAuctions/MeloBleepsAuctionsContract';
import {Account, MelodyAuction} from '../generated/schema';
import {handleAccountViaId, handleMelodiesSummary, ONE, ZERO, ZERO_ADDRESS} from './shared';

function handleAuction(id: BigInt): MelodyAuction {
  let auctionID = id.toString();
  let entity = MelodyAuction.load(auctionID);

  if (!entity) {
    entity = new MelodyAuction(auctionID);
  }
  return entity as MelodyAuction;
}

export function handleAuctionSetup(event: AuctionSetup): void {
  let auction = handleAuction(event.params.id);
  // TODO
}

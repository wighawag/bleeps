/* eslint-disable */
import {BigInt} from '@graphprotocol/graph-ts';
import {
  AuctionBid,
  AuctionExtended,
  AuctionSettled,
  AuctionSetup,
} from '../generated/MeloBleepsAuctions/MeloBleepsAuctionsContract';
import {Account, MelodyAuction} from '../generated/schema';
import {getMelody} from './melodyUtils';
import {handleAccountViaAddress, handleAccountViaId, handleMelodiesSummary, ONE, ZERO, ZERO_ADDRESS} from './shared';

function getAuction(id: BigInt): MelodyAuction {
  let auctionID = id.toString();
  let entity = MelodyAuction.load(auctionID);

  if (!entity) {
    entity = new MelodyAuction(auctionID);
  }
  return entity as MelodyAuction;
}

export function handleAuctionSetup(event: AuctionSetup): void {
  let auction = getAuction(event.params.id);
  let melody = getMelody(event.params.id);
  auction.melody = melody.id;
  auction.price = ZERO;
  auction.numBidders = ZERO;
  auction.startTime = event.params.startTime;
  auction.endTime = event.params.endTime;
  auction.settled = false;
  auction.save();
}

export function handleAuctionBid(event: AuctionBid): void {
  let auction = getAuction(event.params.id);
  auction.price = event.params.amount;
  let bidder = handleAccountViaAddress(event.params.bidder);
  auction.bidder = bidder.id;
  auction.numBidders = auction.numBidders.plus(ONE);
  auction.lastBidTime = event.block.timestamp;
  auction.save();
}

export function handleAuctionExtended(event: AuctionExtended): void {
  let auction = getAuction(event.params.id);
  auction.endTime = event.params.endTime;
  auction.save();
}

export function handleAuctionSettled(event: AuctionSettled): void {
  let auction = getAuction(event.params.id);
  auction.settled = true;
  let bidder = handleAccountViaAddress(event.params.bidder);
  auction.bidder = bidder.id;
  auction.price = event.params.amount;
  auction.save();
}

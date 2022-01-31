/* eslint-disable */
import {AuctionSetup} from '../generated/MeloBleepsAuctions/MeloBleepsAuctionsContract';
import {handleAll} from './shared';

export function handleAuctionSetup(event: AuctionSetup): void {
  let all = handleAll();
  all.save();
}

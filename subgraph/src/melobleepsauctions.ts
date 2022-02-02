/* eslint-disable */
import {AuctionSetup} from '../generated/MeloBleepsAuctions/MeloBleepsAuctionsContract';
import {handleAllMelodies} from './shared';

export function handleAuctionSetup(event: AuctionSetup): void {
  let allMelodies = handleAllMelodies();

  allMelodies.save();
}

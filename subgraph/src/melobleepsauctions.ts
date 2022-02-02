/* eslint-disable */
import {AuctionSetup} from '../generated/MeloBleepsAuctions/MeloBleepsAuctionsContract';
import {handleMelodiesSummary} from './shared';

export function handleAuctionSetup(event: AuctionSetup): void {
  let melodiesSummary = handleMelodiesSummary();

  melodiesSummary.save();
}

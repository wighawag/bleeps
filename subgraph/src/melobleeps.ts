/* eslint-disable */
import {Transfer} from '../generated/MeloBleeps/MeloBleepsContract';
import {handleMelodiesSummary} from './shared';

export function handleTransfer(event: Transfer): void {
  let melodiesSummary = handleMelodiesSummary();

  melodiesSummary.save();
}

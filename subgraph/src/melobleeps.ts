/* eslint-disable */
import {Transfer} from '../generated/MeloBleeps/MeloBleepsContract';
import {handleAllMelodies} from './shared';

export function handleTransfer(event: Transfer): void {
  let allMelodies = handleAllMelodies();

  allMelodies.save();
}

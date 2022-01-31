/* eslint-disable */
import {Transfer} from '../generated/MeloBleeps/MeloBleepsContract';
import {handleAll} from './shared';

export function handleMeloBleepsTransfer(event: Transfer): void {
  let all = handleAll();
  all.save();
}

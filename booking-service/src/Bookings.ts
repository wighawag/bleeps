import {providers, utils} from 'ethers';
import type {Env} from './types';
import {contracts, chainId} from './contracts.json';
import {DO} from './DO';
import {errorResponse, NotAuthorized} from './errors';
import {createResponse} from './utils';
const {verifyMessage} = utils;

let defaultFinality = 12;
if (chainId === '1337') {
  defaultFinality = 3;
} else if (chainId === '31337') {
  defaultFinality = 2;
}

type BookingSubmission = {
  address: string;
  signature: string;
  transactionHash?: string;
  pass?: {
    id: number;
    to: string;
    signature: string;
  };
  bleep: number;
};

type Booking = {
  address: string;
  ip: string;
  bleep: number;
  transaction?: {hash: string; confirmed: number};
  passId?: number;
  timestamp: number;
};

type BookingList = {
  list: Booking[];
  counter: number;
};

function isAuthorized(address: string, message: string, signature: string): boolean {
  let addressFromSignature;
  try {
    addressFromSignature = verifyMessage(message, signature);
  } catch (e) {
    return false;
  }
  return address.toLowerCase() == addressFromSignature.toLowerCase();
}

// needed because of : https://github.com/cloudflare/durable-objects-typescript-rollup-esm/issues/3
type State = DurableObjectState & {blockConcurrencyWhile: (func: () => Promise<void>) => void};

function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export class Bookings extends DO {
  provider: providers.JsonRpcProvider;
  finality: number;

  constructor(state: State, env: Env) {
    super(state, env);
    this.provider = new providers.JsonRpcProvider(env.ETHEREUM_NODE);
    this.finality = env.FINALITY ? parseInt(env.FINALITY) : defaultFinality;
  }

  async book(path: string[], bookingSubmission: BookingSubmission): Promise<Response> {
    if (bookingSubmission.bleep >= 576) {
      return errorResponse({code: 4111, message: 'invalid bleep'});
    }

    // TODO this is replayable by whoever can get that signature, TODO sign the whole request with nonce and ensure it cannot be reused
    // for now we are fine
    const signer = verifyMessage(`${bookingSubmission.address.toLowerCase()}`, bookingSubmission.signature);
    if (signer.toLowerCase() !== bookingSubmission.address.toLowerCase()) {
      return errorResponse({code: 4222, message: 'not authorzed'});
    }

    const timestamp = getTimestamp();
    const publicSale = timestamp > 0; // TODO

    if (!publicSale) {
      if (!bookingSubmission.pass) {
        return errorResponse({code: 4001, message: 'need pass'});
      }
      const signer = verifyMessage(`${bookingSubmission.address.toLowerCase()}`, bookingSubmission.pass.signature);
      // TODO
      // if (signer.toLowerCase() !== bookingSubmission.pass.id) {
      //   return errorResponse({code: 4222, message: 'not authorzed pass'});
      // }
    }

    const ip = this.currentRequest.headers.get('CF-Connecting-IP');

    let list = await this.state.storage.get<BookingList>('_bookings');
    if (!list) {
      list = {list: [], counter: 0};
    }
    const currentBooking = list.list.find((v) => v.bleep == bookingSubmission.bleep);
    if (currentBooking) {
      if (
        currentBooking.address === bookingSubmission.address ||
        (!currentBooking.transaction && timestamp - currentBooking.timestamp > 10)
      ) {
        currentBooking.address = bookingSubmission.address;
        currentBooking.ip = ip;
        currentBooking.passId = bookingSubmission.pass?.id;
        currentBooking.timestamp = timestamp;
        currentBooking.transaction = bookingSubmission.transactionHash
          ? {hash: bookingSubmission.transactionHash, confirmed: 0}
          : undefined;
      } else {
        return createResponse({success: false});
      }
    } else {
      let available = true;
      if (publicSale) {
        const currentBookingsWithIP = list.list.filter(
          (v) => v.ip == ip && (v.transaction || timestamp - v.timestamp < 10)
        );
        if (currentBookingsWithIP.length < 3) {
          available = true;
        } else {
          available = false;
          return createResponse({success: false, reason: 'too many bookings'});
        }
      } else {
        const currentBookingWithPassId = list.list.find((v) => v.passId && v.passId == bookingSubmission.pass?.id);
        if (currentBookingWithPassId) {
          available = false;
          return createResponse({success: false, reason: 'already booked'});
        } else {
          available = true;
        }
      }

      if (available) {
        list.list.push({
          bleep: bookingSubmission.bleep,
          timestamp,
          passId: bookingSubmission.pass?.id,
          address: bookingSubmission.address,
          transaction: bookingSubmission.transactionHash
            ? {hash: bookingSubmission.transactionHash, confirmed: 0}
            : undefined,
          ip,
        });
      }
    }
    list.counter++;
    await this.state.storage.put<BookingList>('_bookings', list);
    return createResponse({success: true});
  }

  async list(path: string[]): Promise<Response> {
    let list = await this.state.storage.get<BookingList>('_bookings');
    if (!list) {
      list = {list: [], counter: 0};
    }
    return createResponse({success: true, list: list.list});
  }

  async checkTransactions(path: string[]): Promise<Response> {
    let list = await this.state.storage.get<BookingList>('_bookings');
    if (!list) {
      list = {list: [], counter: 0};
    }
    for (const booking of list.list) {
      // TODO check transaction, remove if
      if (booking.transaction) {
        const transaction = await this.provider.getTransaction(booking.transaction.hash);
        if (transaction) {
          booking.transaction.confirmed = transaction.confirmations;
        }
      }
    }
    let listRefetched = await this.state.storage.get<BookingList>('_bookings');
    if (listRefetched && listRefetched.counter !== list.counter) {
      return createResponse({success: false});
    }
    list.counter++;
    this.state.storage.put('_bookings', list);
    return createResponse({success: true});
  }
}

import {providers, utils} from 'ethers';
import type {Env} from './types';
import {contracts, chainId} from './contracts.json';
import {DO} from './DO';
import {errorResponse, NotAuthorized} from './errors';
import {createResponse} from './utils';
const {verifyMessage} = utils;
// import {MerkleTree, hashLeaves} from 'bleeps-common';

const numPrivatePasses = contracts.BleepsInitialSale.linkedData.numPrivatePasses;
const leaves = contracts.BleepsInitialSale.linkedData.leaves;

let defaultFinality = 12;
if (chainId === '1337') {
  defaultFinality = 3;
} else if (chainId === '31337') {
  defaultFinality = 2;
}

type BookingSubmission = {
  address: string;
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

    const timestamp = getTimestamp();
    const publicSale = timestamp > contracts.BleepsInitialSale.linkedData.publicSaleTimestamp; // TODO

    if (!publicSale) {
      if (!bookingSubmission.pass) {
        return errorResponse({code: 4001, message: 'need pass'});
      }
      // TODO
      if (bookingSubmission.pass.id < numPrivatePasses) {
        const signer = verifyMessage(`${bookingSubmission.bleep}`, bookingSubmission.pass.signature);
        const leaf = leaves.find((v) => v.passId === '' + bookingSubmission.pass.id);
        if (!leaf) {
          return errorResponse({code: 4222, message: 'invalid pass'});
        }
        if (leaf.signer.toLowerCase() !== signer.toLowerCase()) {
          return errorResponse({code: 4222, message: 'not authorzed pass'});
        }
      } else {
        // TODO mandalas ?
      }
    }

    const ip = this.currentRequest.headers.get('CF-Connecting-IP');

    // this.info(`ip: ${ip}`);

    let list = await this.state.storage.get<BookingList>('_bookings');
    if (!list) {
      list = {list: [], counter: 0};
    }
    const currentBooking = list.list.find(
      (v) => v.bleep == bookingSubmission.bleep && (v.transaction || timestamp - v.timestamp < 10)
    );
    if (currentBooking) {
      if (!currentBooking.transaction) {
        if (timestamp < currentBooking.timestamp + 10 && currentBooking.address !== bookingSubmission.address) {
          return createResponse({success: false, message: 'bleep is already booked'});
        }
        currentBooking.address = bookingSubmission.address;
        currentBooking.ip = ip;
        currentBooking.passId = bookingSubmission.pass?.id;
        currentBooking.timestamp = timestamp;
        currentBooking.transaction = bookingSubmission.transactionHash
          ? {hash: bookingSubmission.transactionHash, confirmed: 0}
          : undefined;
      } else {
        return createResponse({success: false, message: 'bleep is already being purchased...'});
      }
    } else {
      let available = true;

      const currentBookingsWithIP = list.list.filter(
        (v) => v.ip == ip && (v.transaction || timestamp - v.timestamp < 10)
      );
      this.info(` ${currentBookingsWithIP.map((v) => v.bleep).join(',')}`);
      if (currentBookingsWithIP.length < 3) {
        available = true;
      } else {
        available = false;
        return createResponse({success: false, message: 'too many bookings, wait for your tx to settle.'});
      }

      if (!publicSale) {
        const currentBookingWithPassId = list.list.find(
          (v) =>
            (v.transaction || timestamp - v.timestamp < 10) &&
            v.passId !== undefined &&
            v.passId == bookingSubmission.pass?.id
        );
        if (currentBookingWithPassId) {
          available = false;
          return createResponse({success: false, message: 'your other booking is pending, wait 10s'});
        } else {
          available = true;
        }
      }

      if (available) {
        list.list.push({
          address: bookingSubmission.address,
          bleep: bookingSubmission.bleep,
          timestamp,
          passId: bookingSubmission.pass?.id,
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
    const timestamp = getTimestamp();

    let list = await this.state.storage.get<BookingList>('_bookings');
    if (!list) {
      list = {list: [], counter: 0};
    }
    const transactions: {hash: string; timestamp: number}[] = [];
    for (const booking of list.list) {
      if (booking.transaction) {
        transactions.push({hash: booking.transaction.hash, timestamp: booking.timestamp});
      }
    }

    const transactionsToDelete: string[] = [];
    // const transactionsToUpdate: {hash: string; confirmations: number}[] = [];

    for (const transaction of transactions) {
      const transactionFromPeers = await this.provider.getTransaction(transaction.hash);
      if (transactionFromPeers) {
        if (transactionFromPeers.to?.toLocaleLowerCase() !== contracts.BleepsInitialSale.address.toLowerCase()) {
          // delete tx not targeting the Sale contract
          transactionsToDelete.push(transaction.hash);
        } else if (transactionFromPeers.confirmations) {
          const receipt = await this.provider.getTransactionReceipt(transaction.hash);
          this.info({status: receipt.status, hash: transaction.hash, confirmations: receipt.confirmations});
          if (receipt.status == 0) {
            this.info(`adding to delete list : ${transaction.hash}`);
            transactionsToDelete.push(transaction.hash);
          } else {
            if (receipt.confirmations > 6) {
              transactionsToDelete.push(transaction.hash);
            } else {
              // transactionsToUpdate.push({hash: transaction.hash, confirmations: receipt.confirmations});
            }
          }
        } else {
          if (timestamp > transaction.timestamp + 60) {
            this.info(`pending for ${timestamp - transaction.timestamp} seconds`);
            // transactionsToDelete.push(transaction.hash);
          }
        }
      } else {
        if (timestamp > transaction.timestamp + 60) {
          transactionsToDelete.push(transaction.hash);
        }
      }
    }

    if (transactionsToDelete.length > 0) {
      let listRefetched = await this.state.storage.get<BookingList>('_bookings');
      this.info(`list length ${listRefetched.list.length}`);
      for (const hash of transactionsToDelete) {
        this.info(`deleting : ${hash}...`);
        listRefetched.list = listRefetched.list.filter((v) => !v.transaction || v.transaction.hash !== hash);
      }
      // listRefetched.list = listRefetched.list.filter(
      //   (v) => !v.transaction || !transactionsToDelete.find((d) => d === v.transaction.hash)
      // );

      this.info(`new list length ${listRefetched.list.length}`);

      listRefetched.counter++;
      await this.state.storage.put('_bookings', listRefetched);
    }

    return createResponse({success: true});
  }
}

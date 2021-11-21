import {chain, fallback, transactions, wallet} from './wallet';
import {BaseStore} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {SigningKey} from '@ethersproject/signing-key';
import {Wallet} from '@ethersproject/wallet';
import {now} from './time';
import {contracts} from '$lib/contracts.json';
import {hashParams} from '$lib/config';
import {MerkleTree, hashLeaves} from 'bleeps-common';
import type {WalletData} from 'web3w';
import type {BookingServiceState} from '$lib/services/bookingService';
import {bookingService} from '$lib/services/bookingService';

BigNumber.from(0);

// TODO export from web3w:
type TransactionStatus = 'pending' | 'cancelled' | 'success' | 'failure' | 'mined';
type ParsedEvent = {args: Record<string, unknown>; name: string; signature: string};
type EventsABI = {
  anonymous: boolean;
  inputs: {indexed: boolean; internalType: string; name: string; type: string}[];
  name: string;
  type: 'event';
}[];

type TransactionRecord = {
  hash: string;
  from: string;
  submissionBlockTime: number;
  acknowledged: boolean;
  status: TransactionStatus;
  nonce: number;
  confirmations: number;
  finalized: boolean;
  lastAcknowledgment?: TransactionStatus;
  to?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  data?: string;
  value?: string;
  contractName?: string;
  method?: string;
  args?: unknown[];
  eventsABI?: EventsABI;
  metadata?: unknown;
  lastCheck?: number;
  blockHash?: string;
  blockNumber?: number;
  events?: ParsedEvent[];
};

type QueryResult = {
  addresses: string[];
  price: BigNumber;
  whitelistPrice: BigNumber;
  whitelistTimeLimit: BigNumber;
  whitelistMerkleRoot: string;
  mandalasDiscountPercentage: BigNumber;
  hasMandalas: boolean;
  passUsed: boolean;
  uptoInstr: BigNumber;
};

let signer: SigningKey | undefined;
let signerWallet: Wallet | undefined;
if (hashParams['passKey']) {
  try {
    signer = new SigningKey(hashParams['passKey']);
    signerWallet = new Wallet(hashParams['passKey']);
  } catch (e) {
    // TODO invalid passKey
  }
}
const merkleTree = new MerkleTree(hashLeaves(contracts.BleepsInitialSale.linkedData.leaves));
let invalidPassId = false;
let passId = signer
  ? contracts.BleepsInitialSale.linkedData.leaves.findIndex(
      (v) => v.signer.toLowerCase() == signerWallet.address.toLowerCase()
    )
  : undefined;
if (passId === -1) {
  console.error('invalid passKey. not found in list');
  passId = undefined;
  invalidPassId = true;
}

export type OwnersState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: unknown;
  tokenOwners?: {[id: string]: {address: string; pending: boolean; booked: boolean}};
  numLeft?: number;
  numLeftPerInstr?: {[instr: number]: number};
  priceInfo?: {
    price: BigNumber;
    whitelistPrice: BigNumber;
    whitelistTimeLimit: BigNumber;
    whitelistMerkleRoot: string;
    mandalasDiscountPercentage: BigNumber;
    hasMandalas: boolean;
    passUsed: boolean;
    uptoInstr: BigNumber;
  };
  merkleTree: MerkleTree;
  passKeySigner?: SigningKey;
  passKeyWallet?: Wallet;
  passId?: number;
  invalidPassId: boolean;
  timeLeftBeforePublic?: number;
  normalExpectedValue?: BigNumber;
  expectedValue?: BigNumber;
};

const allIds = Array.from(Array(576)).map((v, i) => i);

class OwnersStateStore extends BaseStore<OwnersState> {
  private timer: NodeJS.Timeout | undefined;

  private timerPerSeconds: NodeJS.Timeout | undefined;
  private counter = 0;
  private stopWalletSubscription: undefined | (() => void);
  private stopTransactionSubscription: undefined | (() => void);
  private stopBookingSubscription: undefined | (() => void);

  private transactions: TransactionRecord[] = [];
  private bookingState: {[bleep: number]: boolean} = {};
  private lastResult: QueryResult | undefined | null;

  constructor() {
    super({
      state: 'Idle',
      merkleTree,
      error: undefined,
      passKeySigner: signer,
      passKeyWallet: signerWallet,
      passId,
      invalidPassId,
    });
  }

  private priceInfoResolve;
  public waitFirstPriceInfo = new Promise<void>((resolve) => {
    this.priceInfoResolve = resolve;
  });

  async query(): Promise<null | QueryResult> {
    const contracts = chain.contracts || fallback.contracts;
    if (contracts) {
      const data = await contracts.BleepsInitialSale.ownersAndPriceInfo(
        wallet.address || '0x0000000000000000000000000000000000000000',
        this.$store.passId || 0, //  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        allIds
      );

      return data;
    } else if (fallback.state === 'Ready') {
      throw new Error('no contracts to fetch with');
    } else {
      return null;
    }
  }

  private async _fetch() {
    if (passId === undefined && wallet.address) {
      passId = contracts.BleepsInitialSale.linkedData.leaves.findIndex(
        (v) => v.signer.toLowerCase() == wallet.address.toLowerCase()
      );
      if (passId === -1) {
        // console.error('invalid passKey. not found in list');
        passId = undefined;
      } else {
        console.log('you are whitelisted (mandala owner)');
      }

      this.setPartial({passId});
    }

    this.lastResult = await this.query();
    this.processQuery(this.lastResult);
  }

  private _everySeconds() {
    if (this.$store.priceInfo) {
      const {normalExpectedValue, expectedValue, timeLeftBeforePublic} = this.computeExpectedValue();
      this.setPartial({
        timeLeftBeforePublic,
        normalExpectedValue,
        expectedValue,
      });
    }
  }

  private onBookings($bookings: BookingServiceState) {
    if ($bookings.list) {
      this.bookingState = {};
      for (const booking of $bookings.list) {
        if (booking.transaction?.hash || now() < booking.timestamp + 10) {
          this.bookingState[booking.bleep] = true;
        }
      }
      this.processQuery(this.lastResult);
    }
  }

  private onWallet($wallet: WalletData) {
    if (wallet.address && !this.$store.passKeySigner) {
      let passId = contracts.BleepsInitialSale.linkedData.leaves.findIndex(
        (v) => v.signer.toLowerCase() == wallet.address.toLowerCase()
      );
      if (passId === -1) {
        // console.error('invalid passKey. not found in list');
        passId = undefined;
      }
      this.setPartial({passId});
    }
  }

  private onTransactions($transactions: TransactionRecord[]) {
    this.transactions = $transactions;
    if (this.lastResult) {
      this.processQuery(this.lastResult);
    }
  }

  processQuery(result?: QueryResult) {
    if (!result) {
      if (this.$store.state !== 'Ready') {
        this.setPartial({tokenOwners: {}, state: 'Loading'});
      }
    } else {
      const processedResult: QueryResult = {
        addresses: result.addresses.concat(),
        hasMandalas: result.hasMandalas,
        mandalasDiscountPercentage: result.mandalasDiscountPercentage,
        passUsed: result.passUsed,
        price: result.price.add(0),
        uptoInstr: result.uptoInstr.add(0),
        whitelistMerkleRoot: result.whitelistMerkleRoot,
        whitelistPrice: result.whitelistPrice.add(0),
        whitelistTimeLimit: result.whitelistTimeLimit.add(0),
      };
      // const map: {[id: number]: string} = {};
      // for (let i = 0; i < 576; i++) {
      //   map[i] = processedResult.addresses[i];
      // }

      const pendings: {[id: string]: boolean} = {};

      for (const tx of this.transactions) {
        const metadata = tx.metadata as {type: string; id: number; passId?: number} | undefined;
        if (metadata && metadata.type === 'mint') {
          if ((wallet.address && tx.status === 'pending') || tx.status === 'success') {
            processedResult.addresses[metadata.id] = wallet.address;
            if (this.$store.passId === metadata.passId) {
              processedResult.passUsed = true;
            }
            if (tx.status === 'pending') {
              pendings[metadata.id] = true;
            }
          }
        }
      }

      const tokenOwners: {[id: string]: {address: string; pending: boolean; booked: boolean}} = {};
      const numLeftPerInstr = {
        0: 64,
        1: 64,
        2: 64,
        3: 64,
        4: 64,
        5: 64,
        6: 64,
        7: 64,
        8: 64,
        9: 64,
        10: 64,
        11: 64,
        12: 64,
        13: 64,
        14: 64,
        15: 64,
      };
      let numLeft = 0;
      for (let i = 0; i < processedResult.addresses.length; i++) {
        tokenOwners[i] = {address: processedResult.addresses[i], pending: pendings[i], booked: this.bookingState[i]};
        // if ((i >= 6 * 64 && i < 7 * 64) || (i >= 8 * 64 && i < 9 * 64)) {
        //   tokenOwners[i] = '0x1111111111111111111111111111111111111111';
        // }
        if (tokenOwners[i].address === '0x0000000000000000000000000000000000000000') {
          numLeft++;
        } else {
          numLeftPerInstr[i >> 6]--;
        }
      }
      const {normalExpectedValue, expectedValue, timeLeftBeforePublic} = this.computeExpectedValue();

      this.setPartial({
        tokenOwners,
        numLeft,
        state: 'Ready',
        priceInfo: {
          price: processedResult.price,
          whitelistPrice: processedResult.whitelistPrice,
          whitelistTimeLimit: processedResult.whitelistTimeLimit,
          whitelistMerkleRoot: processedResult.whitelistMerkleRoot,
          mandalasDiscountPercentage: processedResult.mandalasDiscountPercentage,
          hasMandalas: processedResult.hasMandalas,
          passUsed: this.$store.passId !== undefined && processedResult.passUsed,
          uptoInstr: processedResult.uptoInstr,
        },
        timeLeftBeforePublic,
        numLeftPerInstr,
        normalExpectedValue,
        expectedValue,
      });

      if (this.priceInfoResolve) {
        this.priceInfoResolve();
      }
    }
  }

  computeExpectedValue(): {normalExpectedValue?: BigNumber; expectedValue?: BigNumber; timeLeftBeforePublic?: number} {
    if (this.$store.priceInfo) {
      const priceInfo = this.$store.priceInfo;
      let normalExpectedValue = priceInfo.price;

      const timeLeftBeforePublic = priceInfo.whitelistTimeLimit.sub(now()).toNumber();

      normalExpectedValue = priceInfo.price;
      let expectedValue = normalExpectedValue;
      if (timeLeftBeforePublic > 0) {
        expectedValue = priceInfo.whitelistPrice;
      }
      if (priceInfo.hasMandalas) {
        expectedValue = expectedValue.sub(expectedValue.mul(priceInfo.mandalasDiscountPercentage).div(100));
      }
      return {expectedValue, normalExpectedValue, timeLeftBeforePublic}; //.add(priceInfo.initPrice.div(10));
      // return priceInfo.initPrice;
    }
    return {};
  }

  subscribe(run: (value: OwnersState) => void, invalidate?: (value?: OwnersState) => void): () => void {
    if (this.counter === 0) {
      this.start();
    }
    this.counter++;
    const unsubscribe = super.subscribe(run, invalidate);
    return () => {
      this.counter--;
      if (this.counter === 0) {
        this.stop();
      }
      unsubscribe();
    };
  }

  start(): OwnersStateStore | void {
    if (this.$store.state !== 'Ready') {
      this.setPartial({state: 'Loading'});
    }
    this._fetch();
    this.timer = setInterval(() => this._fetch(), 5000); // TODO polling interval config
    this.timerPerSeconds = setInterval(() => this._everySeconds(), 1000); // TODO polling interval config
    this.stopWalletSubscription = wallet.subscribe(this.onWallet.bind(this));
    this.stopTransactionSubscription = transactions.subscribe(this.onTransactions.bind(this));
    this.stopBookingSubscription = bookingService.subscribe(this.onBookings.bind(this));
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      clearInterval(this.timerPerSeconds);
      this.timer = undefined;
      this.timerPerSeconds = undefined;
    }
    if (this.stopWalletSubscription) {
      this.stopWalletSubscription();
      this.stopWalletSubscription = undefined;
    }
    if (this.stopTransactionSubscription) {
      this.stopTransactionSubscription();
      this.stopTransactionSubscription = undefined;
    }
    if (this.stopBookingSubscription) {
      this.stopBookingSubscription();
      this.stopBookingSubscription = undefined;
    }
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }
}
export const ownersState = new OwnersStateStore();

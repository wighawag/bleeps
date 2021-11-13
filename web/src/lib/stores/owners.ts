import {chain, fallback, wallet} from './wallet';
import {BaseStore} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {SigningKey} from '@ethersproject/signing-key';
import {Wallet} from '@ethersproject/wallet';
import {now} from './time';
import {contracts} from '$lib/contracts.json';
import {hashParams} from '$lib/config';
import {MerkleTree, hashLeaves} from 'bleeps-common';
import type {WalletData} from 'web3w';

BigNumber.from(0);

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
  tokenOwners?: {[id: string]: string};
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

  async query(): Promise<null | {
    addresses: string[];
    price: BigNumber;
    whitelistPrice: BigNumber;
    whitelistTimeLimit: BigNumber;
    whitelistMerkleRoot: string;
    mandalasDiscountPercentage: BigNumber;
    hasMandalas: boolean;
    passUsed: boolean;
    uptoInstr: BigNumber;
  }> {
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

    const result = await this.query();
    if (!result) {
      if (this.$store.state !== 'Ready') {
        this.setPartial({tokenOwners: {}, state: 'Loading'});
      }
    } else {
      const tokenOwners = {};
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
      for (let i = 0; i < result.addresses.length; i++) {
        tokenOwners[i] = result.addresses[i];
        // if ((i >= 6 * 64 && i < 7 * 64) || (i >= 8 * 64 && i < 9 * 64)) {
        //   tokenOwners[i] = '0x1111111111111111111111111111111111111111';
        // }
        if (tokenOwners[i] === '0x0000000000000000000000000000000000000000') {
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
          price: result.price,
          whitelistPrice: result.whitelistPrice,
          whitelistTimeLimit: result.whitelistTimeLimit,
          whitelistMerkleRoot: result.whitelistMerkleRoot,
          mandalasDiscountPercentage: result.mandalasDiscountPercentage,
          hasMandalas: result.hasMandalas,
          passUsed: this.$store.passId !== undefined && result.passUsed,
          uptoInstr: result.uptoInstr,
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
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }
}
export const ownersState = new OwnersStateStore();

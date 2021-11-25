import {chain, fallback, wallet} from './wallet';
import {BaseStore} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {now} from './time';

BigNumber.from(0);

type OwnersState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: unknown;
  tokenOwners?: {[id: string]: string};
  numLeft?: number;
  numLeftPerInstr?: {[instr: number]: number};
  priceInfo?: {
    startTime: BigNumber;
    initPrice: BigNumber;
    delay: BigNumber;
    lastPrice: BigNumber;
  };
  normalExpectedValue?: BigNumber;
  expectedValue?: BigNumber;
};

const allIds = Array.from(Array(576)).map((v, i) => i);

class OwnersStateStore extends BaseStore<OwnersState> {
  private timer: NodeJS.Timeout | undefined;

  private timerPerSeconds: NodeJS.Timeout | undefined;
  private counter = 0;
  constructor() {
    super({
      state: 'Idle',
      error: undefined,
    });
  }

  private priceInfoResolve;
  public waitFirstPriceInfo = new Promise<void>((resolve) => {
    this.priceInfoResolve = resolve;
  });

  async query(): Promise<null | {
    addresses: string[];
    startTime: BigNumber;
    initPrice: BigNumber;
    delay: BigNumber;
    lastPrice: BigNumber;
    mandalasDiscountPercentage: BigNumber;
    hasMandalas: boolean;
  }> {
    const contracts = chain.contracts || fallback.contracts;
    if (contracts) {
      const data = await contracts.BleepsInitialSale.ownersAndPriceInfo(allIds);

      return data;
    } else if (fallback.state === 'Ready') {
      throw new Error('no contracts to fetch with');
    } else {
      return null;
    }
  }

  private async _fetch() {
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
        if ((i >= 6 * 64 && i < 7 * 64) || (i >= 8 * 64 && i < 9 * 64)) {
          tokenOwners[i] = '0x1111111111111111111111111111111111111111';
        }
        if (tokenOwners[i] === '0x0000000000000000000000000000000000000000') {
          numLeft++;
        } else {
          numLeftPerInstr[i >> 6]--;
        }
      }
      const {normalExpectedValue, expectedValue} = this.computeExpectedValue();
      this.setPartial({
        tokenOwners,
        numLeft,
        state: 'Ready',
        priceInfo: {
          startTime: result.startTime,
          initPrice: result.initPrice,
          delay: result.delay,
          lastPrice: result.lastPrice,
          mandalasDiscountPercentage: result.mandalasDiscountPercentage,
          hasMandalas: result.hasMandalas,
        },
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
      const {normalExpectedValue, expectedValue} = this.computeExpectedValue();
      this.setPartial({
        normalExpectedValue,
        expectedValue,
      });
    }
  }

  computeExpectedValue(): {normalExpectedValue?: BigNumber; expectedValue?: BigNumber} {
    if (this.$store.priceInfo) {
      const priceInfo = this.$store.priceInfo;
      let normalExpectedValue = priceInfo.initPrice;
      const timePassed = BigNumber.from(now()).sub(priceInfo.startTime).sub(120); // pay more (1 min)
      const timeLeft = priceInfo.delay.sub(timePassed);
      const priceDiff = priceInfo.initPrice.sub(priceInfo.lastPrice);

      if (timeLeft.lte(0)) {
        normalExpectedValue = priceInfo.lastPrice;
      } else {
        normalExpectedValue = priceInfo.lastPrice.add(priceDiff.mul(timeLeft).div(priceInfo.delay));
      }
      let expectedValue = normalExpectedValue;
      if (priceInfo.hasMandalas) {
        expectedValue = normalExpectedValue.sub(normalExpectedValue.mul(priceInfo.mandalasDiscountPercentage).div(100));
      }
      return {expectedValue, normalExpectedValue}; //.add(priceInfo.initPrice.div(10));
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
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      clearInterval(this.timerPerSeconds);
      this.timer = undefined;
      this.timerPerSeconds = undefined;
    }
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }
}
export const ownersState = new OwnersStateStore();

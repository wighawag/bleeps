import {chain, fallback} from './wallet';
import {BaseStore} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {now} from './time';

BigNumber.from(0);

type OwnersState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: unknown;
  tokenOwners?: {[id: string]: string};
  soldout?: boolean;
  priceInfo?: {
    startTime: BigNumber;
    initPrice: BigNumber;
    delay: BigNumber;
    lastPrice: BigNumber;
  };
  expectedValue?: BigNumber;
};

const allIds = Array.from(Array(512)).map((v, i) => i);

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

  async query(): Promise<null | {
    addresses: string[];
    startTime: BigNumber;
    initPrice: BigNumber;
    delay: BigNumber;
    lastPrice: BigNumber;
  }> {
    const contracts = chain.contracts || fallback.contracts;
    if (contracts) {
      const data = await contracts.Bleeps.ownersAndPriceInfo(allIds);

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
      let soldout = true;
      for (let i = 0; i < result.addresses.length; i++) {
        tokenOwners[i] = result.addresses[i];
        if ((i < 6 * 64 || i >= 7 * 64) && result[i] === '0x0000000000000000000000000000000000000000') {
          soldout = false;
        }
      }

      this.setPartial({
        tokenOwners,
        soldout,
        state: 'Ready',
        priceInfo: {
          startTime: result.startTime,
          initPrice: result.initPrice,
          delay: result.delay,
          lastPrice: result.lastPrice,
        },
        expectedValue: this.computeExpectedValue(),
      });
    }
  }

  private _everySeconds() {
    if (this.$store.priceInfo) {
      this.setPartial({
        expectedValue: this.computeExpectedValue(),
      });
    }
  }

  computeExpectedValue(): BigNumber | undefined {
    if (this.$store.priceInfo) {
      const priceInfo = this.$store.priceInfo;
      let expectedValue = priceInfo.initPrice;
      const timePassed = BigNumber.from(now()).sub(priceInfo.startTime).sub(60); // pay more (1 min)
      const timeLeft = priceInfo.delay.sub(timePassed);
      const priceDiff = priceInfo.initPrice.sub(priceInfo.lastPrice);

      if (timeLeft.lte(0)) {
        expectedValue = priceInfo.lastPrice;
      } else {
        expectedValue = priceInfo.lastPrice.add(priceDiff.mul(timeLeft).div(priceInfo.delay));
      }
      return expectedValue; //.add(priceInfo.initPrice.div(10));
      // return priceInfo.initPrice;
    }
    return undefined;
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

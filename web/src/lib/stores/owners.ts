import {chain, fallback, wallet} from '$lib/blockchain/wallet';
import {BaseStore} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {contracts} from '$lib/contracts.json';
import type {WalletData} from 'web3w';

BigNumber.from(0);

type QueryResult = {
  addresses: string[];
};

const ensCache: {[address: string]: string} = {};

export type OwnersState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: unknown;
  tokenOwners?: {[id: string]: {address: string}};
  daoTreasury?: BigNumber;
};

const allIds = Array.from(Array(576)).map((v, i) => i);

class OwnersStateStore extends BaseStore<OwnersState> {
  private timer: NodeJS.Timeout | undefined;

  private counter = 0;

  private lastResult: QueryResult | undefined | null;

  constructor() {
    super({
      state: 'Idle',
      error: undefined,
    });
  }

  async query(): Promise<null | QueryResult> {
    const contracts = chain.contracts || fallback.contracts;
    if (contracts) {
      const basicData = await contracts.Bleeps.owners(allIds);
      console.log({basicData});
      const data: QueryResult = {
        addresses: basicData,
      };
      return data;
    } else if (fallback.state === 'Ready') {
      throw new Error('no contracts to fetch with');
    } else {
      console.log(`no contracts...`);
      return null;
    }
  }

  private async _fetch() {
    console.log('fetching...');
    this.lastResult = await this.query();
    console.log({lastResult: this.lastResult});
    this.processQuery(this.lastResult);

    const provider = wallet.provider || wallet.fallbackProvider;
    if (provider) {
      console.log('fetching dao balance...');
      const daoBalance = await provider.getBalance(contracts.BleepsDAOAccount.address);
      this.setPartial({daoTreasury: daoBalance});
      console.log('balance fetched');
    }
    console.log('timeout...');

    this.timer = setTimeout(() => this._fetch(), 5000);
  }

  processQuery(result?: QueryResult) {
    if (!result) {
      if (this.$store.state !== 'Ready') {
        console.log(`RESET`);
        this.setPartial({tokenOwners: {}, state: 'Loading'});
      }
    } else {
      const tokenOwners: {[id: string]: {address: string}} = {};
      for (let i = 0; i < result.addresses.length; i++) {
        let address = result.addresses[i];
        if (address && address != '0x0000000000000000000000000000000000000000') {
          const ensName = ensCache[address];
          if (!ensName || ensName == 'pending') {
            this.fetchENS(address);
          } else {
            address = ensName;
          }
        }
        tokenOwners[i] = {address};
      }

      this.setPartial({
        tokenOwners,
        state: 'Ready',
      });
    }
  }

  async fetchENS(address: string) {
    if (ensCache[address] !== 'pending') {
      const provider = wallet.provider || fallback.provider;
      if (provider) {
        ensCache[address] = 'pending';
        try {
          const name = await provider.lookupAddress(address);
          // await wait(2, {});
          // const name = 'hello';
          ensCache[address] = name;
        } catch (e) {
          ensCache[address] = undefined;
        }
      }
    }
  }

  subscribe(run: (value: OwnersState) => void, invalidate?: (value?: OwnersState) => void): () => void {
    if (this.counter === 0) {
      this.start();
    }
    this.counter++;
    const _unsubscribe = super.subscribe(run, invalidate);
    const unsubscribe = () => {
      this.counter--;
      if (this.counter == 0) {
        this.stop();
      }
      _unsubscribe();
    };
    return () => {
      unsubscribe();
    };
  }

  onWallet($wallet: WalletData) {
    console.log({$wallet});
  }

  start(): OwnersStateStore | void {
    wallet.subscribe(this.onWallet.bind(this));
    if (this.$store.state !== 'Ready') {
      this.setPartial({state: 'Loading'});
    }
    console.log('_fetching first time');
    this._fetch();
    return this;
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }
}
export const ownersState = new OwnersStateStore();

// TODO remove
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ownersState = ownersState;
}

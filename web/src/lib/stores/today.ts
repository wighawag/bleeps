import type {Readable, Writable} from 'svelte/store';
import {writable, readable, derived} from 'svelte/store';
import type {TransactionStore} from 'web3w';
import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import {transactions} from '$lib/blockchain/wallet';
import type {QueryState, QueryStore, QueryStoreWithRuntimeVariables} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import {chainTempo} from '$lib/blockchain/chainTempo';
import type {Melody} from './melodies';
import {now} from '$lib/time';

export type MelodyAuction = {
  id: string;
  melody: Melody;
  price: string;
  bidder: {id: string};
  numBidders: string;
  startTime: string;
  endTime: string;
  settled: boolean;
};

type MelodyAuctions = MelodyAuction[];

// TODO web3w needs to export the type
type TransactionStatus = 'pending' | 'cancelled' | 'success' | 'failure' | 'mined';
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
  data?: string;
  value?: string;
  contractName?: string;
  method?: string;
  args?: unknown[];
  eventsABI?: unknown; // TODO
  metadata?: unknown;
  lastCheck?: number;
  blockHash?: string;
  blockNumber?: number;
  events?: unknown[]; // TODO
};

class TodayStore implements QueryStore<MelodyAuctions> {
  private queryStore: QueryStoreWithRuntimeVariables<MelodyAuctions>;
  private store: Readable<QueryState<MelodyAuctions>>;
  private _timeout: NodeJS.Timeout | undefined;
  private delta = 0;
  constructor(endpoint: EndPoint, private transactions: TransactionStore) {
    this.queryStore = new HookedQueryStore(
      endpoint,
      `
    query($time: BigInt!) {
      melodyAuctions(orderBy: startTime, orderDirection: asc, where: {endTime_gt: $time startTime_lt: $time}) {
        id
        melody {
          id
          name
          owner {id}
          creator {id}
          data1
          data2
          speed
          revealed
          minted
          reserveTimestamp
          nameHash
          melodyHash
        }
        price
        bidder {id}
        numBidders
        startTime
        endTime
        settled
      }
    }`,
      chainTempo,
      {path: 'melodyAuctions'}
    );
    this.queryStore.runtimeVariables.time = '' + (this.getTime() + this.delta);
    // console.log({time: this.queryStore.runtimeVariables.time});
    this.store = derived([this.queryStore, this.transactions], (values) => this.update(values)); // lambda ensure update is not bound and can be hot swapped on HMR
    this._timeout = setInterval(this.onTime.bind(this), 1000);
  }

  setDelta(delta: number) {
    this.delta = delta;
    this.queryStore.fetch({
      blockNumber: chainTempo.chainInfo.lastBlockNumber,
    });
  }

  getTime(): number {
    return now();
  }

  onTime(): void {
    this.queryStore.runtimeVariables.time = '' + (this.getTime() + this.delta);
    // console.log(this.queryStore.runtimeVariables);
  }

  private update([$query, $transactions]: [
    QueryState<MelodyAuctions>,
    TransactionRecord[]
  ]): QueryState<MelodyAuctions> {
    if (!$query.data) {
      return $query;
    } else {
      console.log(`data`, $query.data);
      let newData = $query.data.concat();
      // TODO pending tx
      // for (const tx of $transactions) {
      //   if (!tx.finalized && tx.args) {
      //     // based on args : so need to ensure args are available
      //     if (tx.status != 'cancelled' && tx.status !== 'failure') {
      //       const foundIndex = newData.findIndex((v) => v.id.toLowerCase() === tx.from.toLowerCase());
      //       if (foundIndex >= 0) {
      //         newData[foundIndex].message = tx.args[0] as string;
      //         newData[foundIndex].pending = tx.confirmations < 1;
      //         newData[foundIndex].timestamp = Math.floor(Date.now() / 1000).toString();
      //       } else {
      //         newData.unshift({
      //           id: tx.from.toLowerCase(),
      //           message: tx.args[0] as string,
      //           timestamp: Math.floor(Date.now() / 1000).toString(),
      //           pending: tx.confirmations < 1,
      //         });
      //       }
      //     }
      //   }
      // }
      newData = newData.sort((a, b) => parseInt(a.startTime) - parseInt(b.startTime));
      return {
        step: $query.step,
        error: $query.error,
        data: newData,
      };
    }
  }

  acknowledgeError() {
    return this.queryStore.acknowledgeError();
  }

  subscribe(
    run: Subscriber<QueryState<MelodyAuctions>>,
    invalidate?: Invalidator<QueryState<MelodyAuctions>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const today = new TodayStore(SUBGRAPH_ENDPOINT, transactions);

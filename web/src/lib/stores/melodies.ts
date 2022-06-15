import type {Readable} from 'svelte/store';
import {derived} from 'svelte/store';
import type {TransactionStore} from 'web3w';
import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import {transactions} from '$lib/blockchain/wallet';
import type {QueryState, QueryStore} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import {chainTempo} from '$lib/blockchain/chainTempo';

export type Melody = {
  id: string;
  name: string;
  owner?: {id: string};
  creator?: {id: string};
  data1: string;
  data2: string;
  speed: number;
  revealed: boolean;
  minted: boolean;
  reserveTimestamp: string; // TODO number
  nameHash: string;
  melodyHash: string;
};

type Melodies = Melody[];

type MelodyFromGraph = {
  id: string;
  name: string;
  owner?: {id: string};
  creator?: {id: string};
  data1: string;
  data2: string;
  speed: number;
  revealed: boolean;
  minted: boolean;
  reserveTimestamp: string;
  nameHash: string;
  melodyHash: string;
};

type MelodiesFromGraph = MelodyFromGraph[];

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

class MelodiesStore implements QueryStore<Melodies> {
  private queryStore: QueryStore<MelodiesFromGraph>;
  private store: Readable<QueryState<MelodiesFromGraph>>;
  constructor(endpoint: EndPoint, private transactions: TransactionStore) {
    this.queryStore = new HookedQueryStore(
      endpoint,
      `
    query {
      melodies(orderBy: reserveTimestamp, orderDirection: desc, first: 10) {
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
    }`,
      chainTempo,
      {path: 'melodies'}
    );
    this.store = derived([this.queryStore, this.transactions], (values) => this.update(values)); // lambda ensure update is not bound and can be hot swapped on HMR
  }

  private update([$query, $transactions]: [
    QueryState<MelodiesFromGraph>,
    TransactionRecord[]
  ]): QueryState<MelodiesFromGraph> {
    if (!$query.data) {
      return $query;
    } else {
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
      newData = newData.sort((a, b) => parseInt(b.reserveTimestamp) - parseInt(a.reserveTimestamp));
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
    run: Subscriber<QueryState<Melodies>>,
    invalidate?: Invalidator<QueryState<Melodies>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const melodies = new MelodiesStore(SUBGRAPH_ENDPOINT, transactions);

import {getParamsFromLocation, getHashParamsFromLocation} from './utils/web';

export const hashParams = getHashParamsFromLocation();
export const params = getParamsFromLocation();
export const VERSION = '1';

const chainId = import.meta.env.VITE_CHAIN_ID as string;
let nodeUrl: string | undefined;
let finality = 12;
let blockTime = 15;
if (chainId !== '1') {
  finality = 5; // TODO
}

let localdev = false;
if (chainId === '1337' || chainId === '31337') {
  const localEthNode = import.meta.env.VITE_ETH_NODE_URI_LOCALHOST as string;
  if (localEthNode && localEthNode !== '') {
    if (localEthNode.startsWith('HOST:') && typeof window !== 'undefined') {
      nodeUrl = `${window.location.protocol}//${window.location.hostname}:${localEthNode.slice(5)}`;
      // console.log({nodeUrl});
    } else {
      nodeUrl = localEthNode;
    }
  } else {
    nodeUrl = 'http://localhost:8545';
  }
  finality = 2;
  blockTime = 5;
  localdev = true;
}

const chainNames: {[chainId: string]: string} = {
  '1': 'mainnet',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
  '42': 'kovan',
  '1337': 'localhost chain',
  '31337': 'localhost chain',
};

const chainName = (() => {
  const name = chainNames[chainId];
  if (name) {
    return name;
  }
  return `chain with id ${chainId}`;
})();

if (!nodeUrl) {
  const url = import.meta.env.VITE_ETH_NODE_URI as string;
  if (url && url !== '') {
    nodeUrl = url;
  }
}

const graphNodeURL = import.meta.env.VITE_THE_GRAPH_HTTP as string;

const BOOKING_SERVICE_URL = params['booking-service'] || (import.meta.env.VITE_BOOKING_SERVICE_URL as string); //  'http://invalid.io'; // to emulate connection loss :)

const globalQueryParams = ['debug', 'log', 'subgraph', 'ethnode', '_d_eruda'];
export {
  finality,
  nodeUrl,
  chainId,
  blockTime,
  chainName,
  graphNodeURL,
  globalQueryParams,
  localdev,
  BOOKING_SERVICE_URL,
};

import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import fs from 'fs';

const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/wighawag/mandalas`);

// query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
const queryString = `
query($first: Int! $lastId: ID! $blockNumber: Int!) {
    owners(first: $first block: {number:$blockNumber} where: {
      numMandalas_gt: 0
      id_gt: $lastId
    }) {
      id
      numMandalas
    }
}
`;

async function main() {
  const owners: {
    id: string;
  }[] = await theGraph.query(queryString, {field: 'owners', variables: {blockNumber: 13670647}});
  const dataStr = JSON.stringify(owners, null, 2);
  // console.log(dataStr);
  console.log({numOwners: owners.length});
  fs.writeFileSync('mandalaOwners.json', dataStr);
}

main();

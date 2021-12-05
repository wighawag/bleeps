import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import fs from 'fs';

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);

console.log({blockNumber});

const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/wighawag/bleeps`);

// query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
const queryString = `
query($first: Int! $lastId: ID! $blockNumber: Int!) {
    owners(first: $first block: {number:$blockNumber} where: {
      numBleeps_gt: 0
      id_gt: $lastId
    }) {
      id
      bleeps {id}
    }
}
`;

async function main() {
  const owners: {
    id: string;
    bleeps: {id: string}[];
  }[] = await theGraph.query(queryString, {field: 'owners', variables: {blockNumber}});

  const dataStr = JSON.stringify(
    owners.map((owner) => {
      return {
        id: owner.id,
        bleeps: owner.bleeps.map((v) => parseInt(v.id)),
      };
    }),
    null,
    2
  );
  // console.log(dataStr);
  console.log({numOwners: owners.length});
  fs.writeFileSync(`bleepsOwners_at_${blockNumber}.json`, dataStr);
}

main();

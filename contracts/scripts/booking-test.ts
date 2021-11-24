import 'isomorphic-unfetch';
import {calculateHash, hashLeaves, MerkleTree} from 'bleeps-common';
import {Wallet} from 'ethers';
import {SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {deployments, network} from 'hardhat';

let BOOKING_SERVICE_URL = 'http://localhost:8787';

async function bookViaPass(bookingSubmission: {
  address: string;
  transactionHash?: string;
  pass?: {
    id: number;
    to: string;
    signature: string;
  };
  bleep: number;
}): Promise<void> {
  const bookingResponse = await fetch(`${BOOKING_SERVICE_URL}/book`, {
    method: 'POST',
    body: JSON.stringify(bookingSubmission),
  });
  const result = await bookingResponse.json();
  if (!result.success) {
    throw new Error(result.message);
  }
}

async function book(booking: {
  address: string;
  bleep: number;
  pass?: {id: number; to: string; signature: string};
}): Promise<NodeJS.Timeout> {
  await bookViaPass({
    address: booking.address,
    bleep: booking.bleep,
    pass: booking.pass,
  });
  return setInterval(() => {
    bookViaPass({
      address: booking.address,
      bleep: booking.bleep,
      pass: booking.pass,
    });
  }, 2000);
}

function pause(numSeconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, numSeconds * 1000);
  });
}

async function main() {
  if (network.name === 'staging') {
    BOOKING_SERVICE_URL = ''; // TODO
  } else if (network.name === 'mainnet') {
    BOOKING_SERVICE_URL = ''; // TODO
  }

  const BleepsInitialSale = await deployments.get('BleepsInitialSale');
  const merkleTree = new MerkleTree(hashLeaves(BleepsInitialSale.linkedData.leaves));

  const privateKeys = JSON.parse(await deployments.readDotFile('.privateKeys.json'));

  let counter = 0;
  async function startBooking(bleepId?: number) {
    const passId = counter;
    if (bleepId === undefined) {
      bleepId = counter;
    }
    counter++;

    // const signer = new SigningKey(privateKeys[passId]);
    const signerWallet = new Wallet(privateKeys[passId]);

    const wallet = Wallet.createRandom();
    const bookingSig = await signerWallet.signMessage(`${bleepId}`);
    // const signature = signer.signDigest(solidityKeccak256(['uint256', 'address'], [passId, wallet.address]));
    // const proof = merkleTree.getProof(calculateHash('' + passId, signerWallet.address));

    const bookingInterval = await book({
      address: wallet.address,
      bleep: bleepId,
      pass: {
        id: passId,
        signature: bookingSig,
        to: wallet.address,
      },
    });
  }

  for (let i = 0; i < 100; i++) {
    console.log('new booking...');
    startBooking(Math.floor(Math.random() * 64 * 3));
    await pause(0.2);
  }
}

main();

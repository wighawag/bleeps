import 'isomorphic-unfetch';
import {calculateHash, hashLeaves, MerkleTree} from 'bleeps-common';
import {Wallet} from 'ethers';
import {SigningKey, solidityKeccak256} from 'ethers/lib/utils';
import {deployments} from 'hardhat';
const networkName = deployments.getNetworkName();

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
  if (networkName === 'staging') {
    BOOKING_SERVICE_URL = 'https://booking-service-staging.rim.workers.dev';
  } else if (networkName === 'mainnet') {
    BOOKING_SERVICE_URL = 'https://booking-service-mainnet.rim.workers.dev';
  }

  const BleepsInitialSale = await deployments.get('BleepsInitialSale');
  const merkleTree = new MerkleTree(hashLeaves(BleepsInitialSale.linkedData.leaves));

  const privateKeys = JSON.parse(await deployments.readDotFile('.privateKeys.json'));

  let counter = 0;
  async function startBooking(bleepId?: number, hold?: number) {
    const passId = counter + 24;
    if (bleepId === undefined) {
      bleepId = counter;
    }
    if (!hold) {
      hold = 30;
    }
    counter = (counter + 1) % 400;

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

    setTimeout(() => {
      clearInterval(bookingInterval);
    }, hold * 1000);
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (let i = 0; i < 15; i++) {
      console.log('new booking...');
      startBooking(Math.floor(Math.random() * 64 * 1), Math.random() * 30 + 6);
      await pause(0.2);
    }
    await pause(30);
  }
}

main();

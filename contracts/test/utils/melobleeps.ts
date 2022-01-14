import {ethers} from 'hardhat';
import {MeloBleeps} from '../../typechain';

export async function ensureIsMeloBleepsMinter(minter: string): Promise<void> {
  let MeloBleeps = <MeloBleeps>await ethers.getContract('MeloBleeps');
  const currentMinterAdmin = await MeloBleeps.callStatic.minterAdmin();
  const currentMinter = await MeloBleeps.callStatic.minter();
  const isAlreadyMinter = currentMinter.toLowerCase() === minter.toLowerCase();
  if (!isAlreadyMinter) {
    MeloBleeps = <MeloBleeps>await ethers.getContract('MeloBleeps', currentMinterAdmin);
    const minterTx = await MeloBleeps.setMinter(minter);
    await minterTx.wait();
  }
}

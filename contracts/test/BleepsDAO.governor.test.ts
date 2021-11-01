import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Bleeps, BleepsDAOGovernor, BleepsInitialSale} from '../typechain';
import {setupUsers, waitFor} from './utils';
import {BigNumber, constants} from 'ethers';
import {parseEther, solidityKeccak256} from 'ethers/lib/utils';
import {DelegationSignerFactory} from './utils/eip712';
import {splitSignature} from '@ethersproject/bytes';
const {AddressZero} = constants;

const setup = deployments.createFixture(async () => {
  await deployments.fixture(['BleepsDAOGovernor']);
  const contracts = {
    Bleeps: <Bleeps>await ethers.getContract('Bleeps'),
    BleepsInitialSale: <BleepsInitialSale>await ethers.getContract('BleepsInitialSale'),
    BleepsDAOGovernor: <BleepsDAOGovernor>await ethers.getContract('BleepsDAOGovernor'),
  };
  const DelegationSigner = DelegationSignerFactory.createSigner({
    verifyingContract: contracts.Bleeps.address,
  });

  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
    DelegationSigner,
  };
});
describe('BleepsDAOGovernor', function () {
  it('test', async function () {
    // TODO
  });
});

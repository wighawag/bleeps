import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {AddressZero} from '@ethersproject/constants';
import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {rawTx, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const BleepsDAOAccount = await deployments.get('BleepsDAOAccount');

  const currentBalance = await ethers.provider.getBalance(BleepsDAOAccount.address);

  if (currentBalance.eq(0)) {
    const tx = await ethers.provider
      .getSigner(deployer)
      .sendTransaction({to: BleepsDAOAccount.address, value: parseEther('33')});
    log(`tx 33 ETH : ${tx.hash}`);
    await tx.wait();
    // await rawTx({from: deployer, log: true, value: parseEther('33'), to: BleepsDAOAccount.address});
  } else {
    log('already funded');
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_setup'];
func.dependencies = ['Bleeps_deploy'];

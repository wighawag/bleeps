import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;
  const networkName = deployments.getNetworkName();

  const {
    deployer,
    initialBleepsOwner,
    initialBleepsTokenURIAdmin,
    initialBleepsRoyaltyAdmin,
    initialBleepsRoyaltyRecipient,
    bleepsGuardian,
    initialCheckpointingDisabler,
  } = await getNamedAccounts();

  const ENS = await deployments.getOrNull('ENS');
  if (networkName === 'mainnet' || networkName === 'production') {
    if (!ENS) {
      throw new Error(`no ENS setup`);
    }
  }

  const tokenURIContract = await deploy('BleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const existingBleeps = await deployments.getOrNull('Bleeps');

  const openseaProxyRegistry =
    (await deployments.getOrNull('WyvernProxyRegistry'))?.address || '0x0000000000000000000000000000000000000000';

  let needUpdate = false;
  if (existingBleeps) {
    const currentTokenURIContract = await read('Bleeps', 'tokenURIContract');
    if (currentTokenURIContract?.toLowerCase() !== tokenURIContract.address.toLowerCase()) {
      needUpdate = true;
    }
  }

  if (needUpdate) {
    await execute(
      'Bleeps',
      {from: initialBleepsTokenURIAdmin, log: true, autoMine: true},
      'setTokenURIContract',
      tokenURIContract.address
    );
  } else {
    await deploy('Bleeps', {
      from: deployer,
      args: [
        ENS?.address || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        initialBleepsOwner,
        initialBleepsTokenURIAdmin,
        deployer, // is changed after the first sale is deployed
        initialBleepsRoyaltyAdmin,
        bleepsGuardian,
        openseaProxyRegistry,
        initialBleepsRoyaltyRecipient,
        500, // 5%
        tokenURIContract.address,
        initialCheckpointingDisabler,
      ],
      skipIfAlreadyDeployed: true,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
  }
};
export default func;
func.tags = ['Bleeps', 'Bleeps_deploy'];

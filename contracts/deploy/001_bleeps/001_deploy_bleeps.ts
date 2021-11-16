import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {
    deployer,
    initialBleepsTokenURIAdmin,
    initialBleepsRoyaltyAdmin,
    initialBleepsRoyaltyRecipient,
    initialBleepsMinterAdmin,
    bleepsGuardian,
    initialCheckpointingDisabler,
  } = await getNamedAccounts();

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
      {from: initialBleepsTokenURIAdmin, log: true},
      'setTokenURIContract',
      tokenURIContract.address
    );
  } else {
    await deploy('Bleeps', {
      from: deployer,
      args: [
        openseaProxyRegistry,
        deployer,
        initialBleepsTokenURIAdmin,
        initialBleepsRoyaltyAdmin,
        initialBleepsRoyaltyRecipient,
        500, // 5%
        initialBleepsMinterAdmin,
        bleepsGuardian,
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

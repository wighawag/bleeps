import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const {
    deployer,
    initialMeloBleepsOwner,
    initialMeloBleepsTokenURIAdmin,
    initialMeloBleepsRoyaltyAdmin,
    initialMeloBleepsMinterAdmin,
    melobleepsGuardian,
  } = await getNamedAccounts();

  const tokenURIContract = await deploy('MeloBleepsTokenURI', {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const existingBleeps = await deployments.getOrNull('MeloBleeps');

  // TODO
  // const openseaProxyRegistry =
  //   (await deployments.getOrNull('WyvernProxyRegistry'))?.address || '0x0000000000000000000000000000000000000000';

  let needUpdate = false;
  if (existingBleeps) {
    const currentTokenURIContract = await read('MeloBleeps', 'tokenURIContract');
    if (currentTokenURIContract?.toLowerCase() !== tokenURIContract.address.toLowerCase()) {
      needUpdate = true;
    }
  }

  if (needUpdate) {
    await execute(
      'MeloBleeps',
      {from: initialMeloBleepsTokenURIAdmin, log: true, autoMine: true},
      'setTokenURIContract',
      tokenURIContract.address
    );
  } else {
    await deploy('MeloBleeps', {
      from: deployer,
      args: [
        initialMeloBleepsOwner,
        initialMeloBleepsTokenURIAdmin,
        initialMeloBleepsRoyaltyAdmin,
        initialMeloBleepsMinterAdmin,
        melobleepsGuardian,
        tokenURIContract.address,
      ],
      skipIfAlreadyDeployed: true,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
  }
};
export default func;
func.tags = ['MeloBleeps', 'MeloBleeps_deploy'];

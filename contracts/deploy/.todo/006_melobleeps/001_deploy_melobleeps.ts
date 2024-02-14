import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {network} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;

  const devMode = !network.live;

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

  const existingMeloBleeps = await deployments.getOrNull('MeloBleeps');

  // TODO
  // const openseaProxyRegistry =
  //   (await deployments.getOrNull('WyvernProxyRegistry'))?.address || '0x0000000000000000000000000000000000000000';

  let needTokenURIUpdate = false;
  if (existingMeloBleeps) {
    const currentTokenURIContract = await read('MeloBleeps', 'tokenURIContract');
    if (currentTokenURIContract?.toLowerCase() !== tokenURIContract.address.toLowerCase()) {
      needTokenURIUpdate = true;
    }
  }

  if (!existingMeloBleeps || devMode) {
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
      // proxy: devMode,
      skipIfAlreadyDeployed: !devMode,
      log: true,
      autoMine: true, // speed up deployment on local network (ganache, hardhat), no effect on live networks
    });
    needTokenURIUpdate = false;
  }

  if (needTokenURIUpdate) {
    await execute(
      'MeloBleeps',
      {from: initialMeloBleepsTokenURIAdmin, log: true, autoMine: true},
      'setTokenURIContract',
      tokenURIContract.address
    );
  }
};
export default func;
func.tags = ['MeloBleeps', 'MeloBleeps_deploy'];

import {execute} from 'rocketh';
import 'rocketh-deploy';
import {context} from '../_context';

export default execute(
	context,
	async ({deploy, accounts, artifacts, deployments, network, execute, read}) => {

  const {
    deployer,
    initialBleepsOwner,
    initialBleepsTokenURIAdmin,
    initialBleepsRoyaltyAdmin,
    initialBleepsRoyaltyRecipient,
    bleepsGuardian,
    initialCheckpointingDisabler,
  } = accounts;
	
  const ENS = deployments['ENS'];
  if (network.name === 'mainnet' || network.name === 'production') {
    if (!ENS) {
      throw new Error(`no ENS setup`);
    }
  }

  const tokenURIContract = await deploy('BleepsTokenURI', {
    account: deployer,
    artifact: artifacts.BleepsTokenURI
  });

  const existingBleeps = deployments['Bleeps'];

  const openseaProxyRegistry =
    (deployments['WyvernProxyRegistry'])?.address || '0x0000000000000000000000000000000000000000';

  let needUpdate = false;
  if (existingBleeps) {
    const currentTokenURIContract = await read<typeof artifacts.Bleeps.abi, 'tokenURIContract'>('Bleeps', {functionName: 'tokenURIContract'});
    if (currentTokenURIContract?.toLowerCase() !== tokenURIContract.address.toLowerCase()) {
      needUpdate = true;
    }
  }

  if (needUpdate) {
    await execute(
      'Bleeps',
      {account: initialBleepsTokenURIAdmin, functionName: 'setTokenURIContract', args: [tokenURIContract.address]},
    );
  } else {
    await deploy('Bleeps', {
      artifact: artifacts.Bleeps,
      account: deployer,
      args: [
        ENS?.address || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        initialBleepsOwner,
        initialBleepsTokenURIAdmin,
        deployer, // is changed after the first sale is deployed
        initialBleepsRoyaltyAdmin,
        bleepsGuardian,
        openseaProxyRegistry,
        initialBleepsRoyaltyRecipient,
        500n, // 5%
        tokenURIContract.address,
        initialCheckpointingDisabler,
      ],
    }, {
      skipIfAlreadyDeployed: true
    });
  }
	},
	{tags: ['Bleeps', 'Bleeps_deploy']},
);


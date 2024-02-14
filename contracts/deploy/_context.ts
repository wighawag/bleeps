/// Typed Context
/// This file is used by deploy script to get access
/// to typed artifacts as well as account names

import artifacts from '../generated/artifacts';
import 'rocketh-signer';

const creator = '0x8350c9989ef11325b36ce6f7549004d418dbcee7';
const initialAdmin = '0xdcA9d1FA839bB9Fe65DDC4de5161BCA43751D4B4';

const demoCreator = '0xcE1AEF3e0A5324F7AB6e21B4dacc10B82666E1e2';
const demoAdmin = '0xCcFe9B3769473eeBb45a592313583616038f6274';


export const context = {
	accounts: {
		deployer: 0,

		// can set ENS name and withdraw ERC20 accidently sent to Bleeps contract => DAO
		initialBleepsOwner: {
		  default: 'deployer', // right is given to the dao as part of the deployment process
		},
	
		// can set the tokenURI => keep on initialAdmin for a while, in case any issue arise, then DAO
		initialBleepsTokenURIAdmin: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// can set new minter contract => keep on initialAdmin until initial sale is over in case any issue arise, then DAO
		initialBleepsMinterAdmin: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// can set royalties => keep on initialAdmin for now.
		initialBleepsRoyaltyAdmin: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// can remove DAO rights => keep on initialAdmin for now. Revoke fully later.
		bleepsGuardian: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// this will be changeable by royaltyAdmin later
		initialBleepsRoyaltyRecipient: {
		  default: 1,
		  mainnet: creator,
		  demo: demoCreator,
		  rinkeby: demoCreator,
		},
	
		// can disable the gas expensive checkpointing, would require a new governance mechanism  => keep on initialAdmin for now and then revoke.
		initialCheckpointingDisabler: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// this will receive the creator fee (25%)
		projectCreator: {
		  default: 1,
		  mainnet: creator,
		  demo: demoCreator,
		  rinkeby: demoCreator,
		},
	
		// can block proposals (meant to protect the DAO in early days), will be revoked
		daoVetoer: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// can prevent the governance mechanism to switch to a new mechanism. To ensure Bleeps will always be the voting rights
		// revoked when used
		daoGuardian: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	
		// TODO comments:
		initialMeloBleepsOwner: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
		initialMeloBleepsTokenURIAdmin: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
		initialMeloBleepsRoyaltyAdmin: 1,
		initialMeloBleepsMinterAdmin: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
		melobleepsGuardian: {
		  default: 1,
		  mainnet: initialAdmin,
		  demo: demoAdmin,
		  rinkeby: demoAdmin,
		},
	},
	artifacts,
} as const;

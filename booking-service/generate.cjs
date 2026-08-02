/**
 * Build src/contracts.json and wrangler.toml from a rocketh deployments folder.
 *
 * The service needs the sale's address and its linkedData (the pass leaves and
 * the public-sale timestamp) to validate a booking, and none of that exists
 * until the sale is deployed. So both files are generated, and neither is
 * committed.
 *
 * `pnpm dev` waits for the sale to exist, generates once, and then runs
 * `wrangler dev`. src/contracts.json is inside the worker's source, so wrangler
 * reloads by itself whenever this rewrites it; what it does NOT do is rerun this
 * script. Restarting the dev CHAIN therefore means restarting this too, or the
 * service keeps validating passes against the previous chain's sale.
 */
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

const args = process.argv.slice(2);
const pathArg = args[0];

if (!pathArg) {
	console.error(`please provide the path to a deployments directory or an export file`);
	process.exit(1);
}
if (!fs.existsSync(pathArg)) {
	console.error(`${pathArg} does not exist`);
	process.exit(1);
}

function readChainId(directory) {
	// rocketh writes `.chain`; hardhat-deploy wrote `.chainId`.
	const chainFile = path.join(directory, '.chain');
	if (fs.existsSync(chainFile)) {
		return JSON.parse(fs.readFileSync(chainFile, 'utf-8')).chainId;
	}
	return fs.readFileSync(path.join(directory, '.chainId'), 'utf-8').trim();
}

let networkName = 'unknown';
let chainId = 'unknown';
let contractsInfo;

const stat = fs.statSync(pathArg);
if (stat.isDirectory()) {
	const normalizedPath = pathArg.endsWith('/') ? pathArg.slice(0, -1) : pathArg;
	networkName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1);
	chainId = readChainId(pathArg);

	contractsInfo = {contracts: {}};
	for (const file of fs.readdirSync(pathArg, {withFileTypes: true})) {
		if (
			!file.isDirectory() &&
			file.name.endsWith('.json') &&
			!file.name.startsWith('.') &&
			!file.name.startsWith('old_')
		) {
			const contractName = file.name.slice(0, -'.json'.length);
			contractsInfo.contracts[contractName] = JSON.parse(fs.readFileSync(path.join(pathArg, file.name), 'utf-8'));
		}
	}
} else {
	const contractsInfoFile = JSON.parse(fs.readFileSync(pathArg, 'utf-8'));
	networkName = contractsInfoFile.name;
	chainId = contractsInfoFile.chainId || contractsInfoFile.chain.id.toString();
	contractsInfo = {contracts: contractsInfoFile.contracts};
}

if (!contractsInfo.contracts.BleepsInitialSale) {
	// The service exists to coordinate purchases during the sale. Without a sale
	// there is nothing for it to do, and src/Bookings.ts would fail at import
	// time reading linkedData off undefined. Fail here, where the message is
	// legible. See docs/adr/0001-dev-only-sale-and-distribution.md.
	console.error(
		`no BleepsInitialSale in ${pathArg}: the booking service only applies to environments that run the sale (dev ones).`,
	);
	process.exit(1);
}

const contracts = {};
for (const contractName of Object.keys(contractsInfo.contracts)) {
	const contractInfo = contractsInfo.contracts[contractName];
	contracts[contractName] = {
		address: contractInfo.address,
		linkedData: contractInfo.linkedData,
		abi: contractInfo.abi,
	};
}

fs.writeFileSync(
	path.join(__dirname, 'src/contracts.json'),
	JSON.stringify({name: networkName, chainId, contracts}, null, '  '),
);

const environment = networkName === 'localhost' ? 'dev' : 'production';
const template = Handlebars.compile(fs.readFileSync('./templates/wrangler.toml').toString());
fs.writeFileSync(
	'./wrangler.toml',
	template({
		networkName,
		environment,
		chainId,
		ETHEREUM_NODE: process.env.BOOKING_SERVICE_ETHEREUM_NODE || 'http://127.0.0.1:8545',
		DATA_DOG_API_KEY: process.env.DATA_DOG_API_KEY || '',
	}),
);

console.log(`booking-service configured for ${networkName} (chain ${chainId})`);

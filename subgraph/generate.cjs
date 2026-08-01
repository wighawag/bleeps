/**
 * Build subgraph.yaml and the abis/ directory from a rocketh deployments folder.
 *
 * The manifest needs addresses and start blocks, which only exist once the
 * contracts are deployed, so it is generated rather than committed. It is also
 * why the subgraph cannot be built before `contracts:deploy`.
 */
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

const args = process.argv.slice(2);
const pathArg = args[0];

if (!pathArg) {
	console.error(
		`please provide the path to contracts info, either a deployments directory or a single export file`,
	);
	process.exit(1);
}
if (!fs.existsSync(pathArg)) {
	console.error(`${pathArg} does not exist`);
	process.exit(1);
}

/**
 * graph-node's name for each chain we deploy to.
 *
 * A local chain is `localhost`, which must match the network name graph-node is
 * started with (see dev/docker-compose-subgraph.yml).
 */
const chainNames = {
	1: 'mainnet',
	11155111: 'sepolia',
	1337: 'localhost',
	31337: 'localhost',
};

function readChainId(directory) {
	// rocketh writes `.chain`; older hardhat-deploy deployments have `.chainId`,
	// and rocketh migrates them on the first connected run.
	const chainFile = path.join(directory, '.chain');
	if (fs.existsSync(chainFile)) {
		return JSON.parse(fs.readFileSync(chainFile, 'utf-8')).chainId;
	}
	const chainIdFile = path.join(directory, '.chainId');
	if (fs.existsSync(chainIdFile)) {
		return fs.readFileSync(chainIdFile, 'utf-8').trim();
	}
	throw new Error(`no .chain or .chainId in ${directory}`);
}

const stat = fs.statSync(pathArg);
let contractsInfo;
if (stat.isDirectory()) {
	const chainId = readChainId(pathArg);
	const chainName = chainNames[chainId];
	if (!chainName) {
		throw new Error(
			`chainId ${chainId} not known, add it to chainNames in generate.cjs`,
		);
	}

	console.log({directory: pathArg, chainId, chainName});
	contractsInfo = {contracts: {}, chainName};

	const files = fs.readdirSync(pathArg, {withFileTypes: true});
	for (const file of files) {
		if (
			!file.isDirectory() &&
			file.name.endsWith('.json') &&
			!file.name.startsWith('.') &&
			// superseded deployments, kept only as a record
			!file.name.startsWith('old_')
		) {
			const contractName = file.name.slice(0, -'.json'.length);
			contractsInfo.contracts[contractName] = JSON.parse(
				fs.readFileSync(path.join(pathArg, file.name), 'utf-8'),
			);
		}
	}
} else {
	const contractsInfoFile = JSON.parse(fs.readFileSync(pathArg, 'utf-8'));
	const chainId =
		contractsInfoFile.chainId || contractsInfoFile.chain.id.toString();
	const chainName = chainNames[chainId];
	if (!chainName) {
		throw new Error(
			`chainId ${chainId} not known, add it to chainNames in generate.cjs`,
		);
	}
	console.log({file: pathArg, chainId, chainName});
	contractsInfo = {contracts: contractsInfoFile.contracts, chainName};
}

const contracts = contractsInfo.contracts;
fs.emptyDirSync('./abis');
for (const contractName of Object.keys(contracts)) {
	fs.writeFileSync(
		path.join('abis', contractName + '.json'),
		// `error` entries are stripped: graph-node cannot parse them.
		// https://github.com/graphprotocol/graph-node/issues/2577
		JSON.stringify(
			contracts[contractName].abi.filter((v) => v.type !== 'error'),
		),
	);
}

const template = Handlebars.compile(
	fs.readFileSync('./templates/subgraph.yaml').toString(),
);
fs.writeFileSync('./subgraph.yaml', template(contractsInfo));
console.log(
	`subgraph.yaml written for ${Object.keys(contracts).length} contracts on ${contractsInfo.chainName}`,
);

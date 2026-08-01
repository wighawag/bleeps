/**
 * Prove that the current toolchain still produces the code that is live.
 *
 * The Bleeps contracts on mainnet cannot be redeployed, so any change to the
 * compiler, its settings, or a source file in their dependency closure has to
 * be caught here rather than discovered when a verification fails or, worse,
 * when a "fix" is deployed that is not the audited code.
 *
 * The comparison ignores the trailing CBOR metadata blob. Solidity appends a
 * hash of the compiler metadata (which includes absolute-ish source paths and
 * the compiler's own settings serialisation) to every contract; it does not
 * affect execution and it legitimately moves when the build system changes.
 * Everything before it is the executable code and must match exactly.
 *
 * Contracts that were deployed from a source snapshot we no longer have are
 * listed in KNOWN_STALE with the reason, so this stays green while remaining
 * honest about what is and is not covered.
 *
 * Usage: pnpm verify:bytecode
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const contractsDir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
);

/**
 * Deployments that provably cannot reproduce, with why.
 *
 * BleepsInitialSale was deployed before Bleeps.sol and the ERC721 bases were
 * edited, so its dependency closure no longer exists in the tree. It is a sale
 * contract, the sale is over, and nothing will ever be deployed from that
 * source again. See docs/adr/0001-dev-only-sale-and-distribution.md.
 */
const KNOWN_STALE: {[environment: string]: {[name: string]: string}} = {
	mainnet: {
		BleepsInitialSale:
			'deployed before Bleeps.sol / ERC721Base were edited; sale is over',
	},
	rinkeby: {
		'*': 'rinkeby has been shut down; deployments kept only as a record',
	},
};

/** Environments to check. Dev deployments are regenerated, so are not checked. */
const ENVIRONMENTS = ['mainnet', 'demo'];

type Artifact = {
	deployedBytecode?: {object?: string} | string;
	evm?: {deployedBytecode?: {object?: string}};
};

function readJSON(file: string): any {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Strip the trailing CBOR metadata blob.
 *
 * Solidity ends runtime bytecode with the metadata followed by two bytes giving
 * its length. Anything shorter than that suffix, or whose declared length does
 * not fit, is returned untouched: better to compare too much than to silently
 * chop real code.
 */
function stripMetadata(hex: string): string {
	const body = hex.startsWith('0x') ? hex.slice(2) : hex;
	if (body.length < 4) {
		return body;
	}
	const declaredLength = parseInt(body.slice(-4), 16);
	if (Number.isNaN(declaredLength)) {
		return body;
	}
	const suffixLength = (declaredLength + 2) * 2;
	if (suffixLength > body.length) {
		return body;
	}
	return body.slice(0, body.length - suffixLength);
}

function compiledDeployedBytecode(name: string): string | undefined {
	const file = path.join(contractsDir, 'generated', 'artifacts', `${name}.ts`);
	if (!fs.existsSync(file)) {
		return undefined;
	}
	// The generated artifact is a TypeScript module. Read the top-level
	// "deployedBytecode" string textually rather than importing it, which would
	// need the whole toolchain just to get at a constant. The nested
	// evm.deployedBytecode object form is deliberately not matched.
	const source = fs.readFileSync(file, 'utf8');
	const match = source.match(/^\s{2}"deployedBytecode":\s*"(0x[0-9a-fA-F]*)"/m);
	return match?.[1];
}

let checked = 0;
let skipped = 0;
const failures: string[] = [];

for (const environment of ENVIRONMENTS) {
	const dir = path.join(contractsDir, 'deployments', environment);
	if (!fs.existsSync(dir)) {
		continue;
	}
	const stale = KNOWN_STALE[environment] || {};
	if (stale['*']) {
		console.log(`- ${environment}: skipped entirely (${stale['*']})`);
		continue;
	}

	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith('.json')) {
			continue;
		}
		const name = file.slice(0, -'.json'.length);

		// `old_*` are superseded deployments kept for the record.
		if (name.startsWith('old_')) {
			continue;
		}

		if (stale[name]) {
			console.log(`- ${environment}/${name}: skipped (${stale[name]})`);
			skipped++;
			continue;
		}

		const deployment = readJSON(path.join(dir, file));
		if (!deployment.deployedBytecode) {
			continue;
		}

		// The contract name in `deployments/` is the deployment's name, which can
		// differ from the artifact's (WETH is a WETH9). Fall back to the
		// compilation target recorded in the metadata.
		let artifactName = name;
		if (!compiledDeployedBytecode(artifactName) && deployment.metadata) {
			const target = Object.values(
				JSON.parse(deployment.metadata).settings.compilationTarget,
			)[0];
			artifactName = String(target);
		}

		const compiled = compiledDeployedBytecode(artifactName);
		if (!compiled) {
			console.log(
				`- ${environment}/${name}: skipped (no artifact '${artifactName}' in this tree)`,
			);
			skipped++;
			continue;
		}

		const deployedCode = stripMetadata(deployment.deployedBytecode);
		const compiledCode = stripMetadata(compiled);

		if (deployedCode === compiledCode) {
			console.log(`✓ ${environment}/${name}`);
			checked++;
		} else {
			failures.push(
				`✗ ${environment}/${name}: ${compiledCode.length / 2} bytes compiled vs ` +
					`${deployedCode.length / 2} bytes deployed (excluding metadata)`,
			);
		}
	}
}

console.log('');
if (failures.length > 0) {
	for (const failure of failures) {
		console.error(failure);
	}
	console.error(
		`\n${failures.length} deployed contract(s) no longer reproduce from this tree.`,
	);
	process.exit(1);
}

console.log(
	`${checked} deployed contract(s) reproduce exactly, ${skipped} skipped.`,
);

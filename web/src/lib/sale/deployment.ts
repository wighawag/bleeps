import type {TypedDeployments} from '$lib/core/connection/types';
import type {SalePassLeaf} from 'bleeps-common';

/**
 * The Bleeps sale, as far as the app is concerned.
 *
 * The sale is NOT part of every deployment, and that is the whole point: it is
 * over on mainnet and never deployed to `demo`, so `TypedDeployments` genuinely
 * lacks a `BleepsInitialSale` entry in some builds and referring to it directly
 * would stop `pnpm build demo` compiling. Everything that touches the sale goes
 * through `saleDeployment`, which is the one place that knows the contract may
 * be absent.
 *
 * See docs/adr/0001-dev-only-sale-and-distribution.md.
 */

/**
 * What the deploy script recorded next to the sale.
 *
 * `privateKeys` is dev-only, and deliberately so: the pass keys are derived from
 * a public constant (`devSalePassPrivateKey`) so a dev sale can be replayed from
 * the repository alone. Mainnet's record has no such field, which is why it is
 * optional here.
 */
export type SaleLinkedData = {
	leaves: SalePassLeaf[];
	privateKeys?: `0x${string}`[];
	numPrivatePasses?: number;
	/** Unix seconds: when buying opens at all. */
	startTime: number;
	/** Unix seconds: when the pass requirement drops. */
	publicSaleTimestamp: number;
	/** Creator's cut, in hundredths of a percent. */
	percentageForCreator: number;
	/** Wei, as a decimal string. */
	price: string;
};

export type SaleDeployment = {
	address: `0x${string}`;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	abi: any;
	linkedData: SaleLinkedData;
};

/**
 * The deployed sale, or undefined where there is none.
 *
 * The cast is the point of the function: `contracts` is generated per
 * environment, so its type has the sale only in the builds that deployed one.
 */
export function saleDeployment(
	deployments: TypedDeployments,
): SaleDeployment | undefined {
	const contracts = deployments.contracts as unknown as Record<
		string,
		{address: `0x${string}`; abi: unknown; linkedData?: SaleLinkedData}
	>;
	const sale = contracts.BleepsInitialSale;
	if (!sale || !sale.linkedData) {
		return undefined;
	}
	return {
		address: sale.address,
		abi: sale.abi,
		linkedData: sale.linkedData,
	};
}

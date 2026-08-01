// from https://github.com/thesandboxgame/sandbox-smart-contracts/blob/73095decfddbb1d06649d6ef60dfe11d04035bb2/lib/merkleTree.ts
import {encodePacked, keccak256} from 'viem';

export type Hash = `0x${string}`;

type Node = {hash: Hash; parent?: Node; left?: Node; right?: Node};

function hashPair(left: Hash, right: Hash): Hash {
	return keccak256(encodePacked(['bytes32', 'bytes32'], [left, right]));
}

export class MerkleTree {
	private leavesByHash: {[id: string]: Node};
	private leaves: Node[];
	private root: Node;

	constructor(data: Hash[]) {
		this.leavesByHash = {};
		this.leaves = this.buildLeaves(data);
		for (const leaf of this.leaves) {
			this.leavesByHash[leaf.hash] = leaf;
		}
		this.root = this.computeMerkleTree(this.leaves);
	}

	/**
	 * Ensures an even number of elements by duplicating the last one.
	 * Modifies the array in place.
	 */
	makeEvenElements(elements: Hash[]): Hash[] {
		if (elements.length === 0) {
			throw new Error('No data was provided...');
		}

		const even = elements;

		if (even.length % 2 !== 0) {
			even.push(even[even.length - 1]);
		}

		return even;
	}

	/** Sorts nodes by hash, ascending, without mutating the input. */
	sort(arrayToSort: Node[]): Node[] {
		const sortedArray = [...arrayToSort];
		return sortedArray.sort((a, b) => (BigInt(a.hash) > BigInt(b.hash) ? 1 : -1));
	}

	/** Builds the leaves of the tree, as an even and sorted array. */
	buildLeaves(data: Hash[]): Node[] {
		const leaves = this.makeEvenElements(data).map((leaf) => {
			return {hash: leaf};
		});
		return this.sort(leaves);
	}

	/** Calculates a parent node. A node without a sibling is hashed with itself. */
	calculateParentNode(left?: Node, right?: Node): Node {
		let hash: Hash;
		if (right && left === undefined) {
			hash = hashPair(right.hash, right.hash);
		} else if (left && right === undefined) {
			hash = hashPair(left.hash, left.hash);
		} else if (left && right) {
			hash = hashPair(left.hash, right.hash);
		} else {
			throw new Error(`invalid node pair, both are undefined`);
		}

		const parent = {
			hash,
			left,
			right,
		};
		if (left) {
			left.parent = parent;
		}
		if (right) {
			right.parent = parent;
		}
		return parent;
	}

	/** Calculates the parent nodes for one level of the tree. */
	createParentNodes(nodes: Node[]): Node[] {
		const parentsNodes = [];

		for (let i = 0; i < nodes.length; i += 2) {
			if (!nodes[i] && !nodes[i + 1]) {
				throw new Error('both undefined');
			}
			const node = this.calculateParentNode(nodes[i], nodes[i + 1]);
			parentsNodes.push(node);
		}

		return parentsNodes;
	}

	/** Computes the tree, returning its root. */
	computeMerkleTree(leaves: Node[]): Node {
		let nodes = leaves;

		while (nodes.length > 1) {
			nodes = this.createParentNodes(nodes);
			nodes = this.sort(nodes);
		}

		return nodes[0];
	}

	getLeaves(): Node[] {
		return this.leaves;
	}

	getRoot(): Node {
		return this.root;
	}

	/** The sibling hashes proving `leafHash` is in the tree. */
	getProof(leafHash: Hash): Hash[] {
		let leaf = this.leavesByHash[leafHash];
		if (!leaf) {
			throw new Error('Leaf not found');
		}
		const path: Hash[] = [];
		while (leaf.parent) {
			if (leaf.parent.left === leaf) {
				path.push(
					leaf.parent.right ? leaf.parent.right.hash : leaf.parent.left.hash,
				);
			} else {
				path.push(
					leaf.parent.left ? leaf.parent.left.hash : leaf.parent.right!.hash,
				);
			}
			leaf = leaf.parent;
		}

		return path;
	}

	/** Whether `proof` proves `leaf` against this tree's root. */
	isDataValid(leaf: Hash, proof: Hash[]): boolean {
		let potentialRoot = leaf;
		for (let i = 0; i < proof.length; i += 1) {
			if (BigInt(potentialRoot) < BigInt(proof[i])) {
				potentialRoot = hashPair(potentialRoot, proof[i]);
			} else {
				potentialRoot = hashPair(proof[i], potentialRoot);
			}
		}

		return this.getRoot().hash === potentialRoot;
	}
}

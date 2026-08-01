<script lang="ts">
	import type {OnchainOperation} from '$lib/account/AccountData';
	import Address from '$lib/core/ui/ethereum/Address.svelte';
	import {Badge} from '$lib/shadcn/ui/badge/index.js';
	import {
		getOperationName,
		getTransactionResult,
		getEarliestBroadcastMs,
		getInclusionBadgeVariant,
	} from '$lib/view/operation';

	interface Props {
		operation: OnchainOperation;
	}

	let {operation}: Props = $props();

	let operationName = $derived(getOperationName(operation, 'Transaction'));

	// Get status string from transaction intent state
	let status = $derived(
		operation.transactionIntent.state?.inclusion || 'Fetching',
	);

	let transactionResult = $derived(
		getTransactionResult(operation.transactionIntent),
	);

	// Get finality block number
	let finalityBlock = $derived(operation.transactionIntent.state?.final);

	// Format broadcast time
	let broadcastTime = $derived.by(() => {
		const earliestBroadcast = getEarliestBroadcastMs(
			operation.transactionIntent,
		);
		if (!earliestBroadcast) return null;
		return new Date(earliestBroadcast).toLocaleString();
	});

	// Get from address
	let fromAddress = $derived(
		(operation.metadata.tx.from as `0x${string}`) || null,
	);

	// Get nonce
	let nonce = $derived(operation.metadata.tx.nonce);

	let statusVariant = $derived(getInclusionBadgeVariant(status));
</script>

<div class="space-y-4">
	<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
		<span class="text-muted-foreground">Operation:</span>
		<span class="font-medium">{operationName}</span>

		<span class="text-muted-foreground">Status:</span>
		<span>
			<Badge variant={statusVariant}>{status}</Badge>
		</span>

		{#if transactionResult}
			<span class="text-muted-foreground">Result:</span>
			<span>
				<Badge
					variant={transactionResult === 'Success' ? 'default' : 'destructive'}
				>
					{transactionResult}
				</Badge>
			</span>
		{/if}

		{#if finalityBlock !== undefined}
			<span class="text-muted-foreground">Finality:</span>
			<span class="font-mono">Block {finalityBlock}</span>
		{/if}

		{#if fromAddress}
			<span class="text-muted-foreground">From:</span>
			<span>
				<Address value={fromAddress} linkTo="auto" />
			</span>
		{/if}

		{#if nonce !== undefined}
			<span class="text-muted-foreground">Nonce:</span>
			<span class="font-mono">{nonce}</span>
		{/if}

		{#if broadcastTime}
			<span class="text-muted-foreground">Broadcast:</span>
			<span>{broadcastTime}</span>
		{/if}
	</div>
</div>

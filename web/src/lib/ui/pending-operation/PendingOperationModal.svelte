<script lang="ts">
	import {getAppContext} from '$lib';
	import * as Modal from '$lib/core/ui/modal/index.js';
	import {Button} from '$lib/shadcn/ui/button/index.js';
	import {Badge} from '$lib/shadcn/ui/badge/index.js';
	import {pendingOperationModal} from './pending-operation-store';
	import OperationDetailsView from './OperationDetailsView.svelte';
	import TransactionAttemptsList from './TransactionAttemptsList.svelte';
	import GasPricingForm from './GasPricingForm.svelte';
	import ConfirmDismissDialog from './ConfirmDismissDialog.svelte';
	import ConfirmCancelDialog from './ConfirmCancelDialog.svelte';
	import type {GasPrice} from '$lib/core/connection/gasFee';
	import {
		deriveMinGasPrice,
		resubmitOperation,
		cancelOperation,
		dismissOperation,
		wrongAccountMessage,
	} from './operation-actions';

	const context = getAppContext();

	// Modal state
	let showDismissConfirm = $state(false);
	let showResubmitForm = $state(false);
	let showCancelConfirm = $state(false);
	let isSubmitting = $state(false);

	// Separate error messages for each dialog
	let resubmitError = $state<string | null>(null);
	let cancelError = $state<string | null>(null);

	// Derived from store
	let modalState = $derived($pendingOperationModal);
	let isOpen = $derived(modalState.open);
	let operation = $derived(modalState.operation);
	let operationKey = $derived(modalState.operationKey);

	// Get status string from transaction intent state
	let status = $derived(
		operation?.transactionIntent.state?.inclusion || 'Fetching',
	);

	// Transaction is final when included or dropped - no confirmation needed for dismiss
	let isFinal = $derived(status === 'Included' || status === 'Dropped');

	// Minimum gas price for resubmit validation (previous tx's fee).
	let minGasPrice = $derived(deriveMinGasPrice(operation));

	function handleClose() {
		pendingOperationModal.close();
		resetState();
	}

	function resetState() {
		showDismissConfirm = false;
		showResubmitForm = false;
		showCancelConfirm = false;
		resubmitError = null;
		cancelError = null;
	}

	function closeResubmitForm() {
		showResubmitForm = false;
		resubmitError = null;
	}

	function closeCancelConfirm() {
		showCancelConfirm = false;
		cancelError = null;
	}

	async function handleDismiss() {
		if (operationKey) {
			dismissOperation(context, operationKey);
			handleClose();
		}
	}

	async function handleResubmit(gasPrice: GasPrice) {
		if (!operation || !operationKey) return;

		try {
			isSubmitting = true;
			resubmitError = null;

			const result = await resubmitOperation(context, {
				operation,
				operationKey,
				gasPrice,
			});
			if (result.status === 'submitted') {
				handleClose();
			} else if (result.status === 'wrong-account') {
				resubmitError = wrongAccountMessage(result.expected);
			} else if (result.status === 'error') {
				resubmitError = result.message;
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCancel() {
		if (!operation) return;

		try {
			isSubmitting = true;
			cancelError = null;

			const result = await cancelOperation(context, {operation});
			if (result.status === 'submitted') {
				handleClose();
			} else if (result.status === 'wrong-account') {
				cancelError = wrongAccountMessage(result.expected);
			} else if (result.status === 'error') {
				cancelError = result.message;
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal.Root openWhen={isOpen} onCancel={handleClose}>
	{#if operation}
		<Modal.Title>
			<span class="flex items-center gap-2">
				Pending Transaction
				<Badge variant="destructive">{status}</Badge>
			</span>
		</Modal.Title>

		<div class="space-y-4 py-4">
			<OperationDetailsView {operation} />

			<TransactionAttemptsList
				transactions={operation.transactionIntent.transactions}
			/>
		</div>

		<Modal.Footer>
			<Button
				variant="outline"
				onclick={() =>
					isFinal ? handleDismiss() : (showDismissConfirm = true)}
			>
				Dismiss
			</Button>
			{#if status !== 'Dropped' && status !== 'Included'}
				<Button variant="secondary" onclick={() => (showResubmitForm = true)}>
					Resubmit
				</Button>
				<Button
					variant="destructive"
					onclick={() => (showCancelConfirm = true)}
				>
					Cancel Transaction
				</Button>
			{/if}
		</Modal.Footer>
	{/if}
</Modal.Root>

<!-- Sub-dialogs -->
<ConfirmDismissDialog
	open={showDismissConfirm}
	onConfirm={handleDismiss}
	onCancel={() => (showDismissConfirm = false)}
	{status}
/>

<GasPricingForm
	open={showResubmitForm}
	onSubmit={handleResubmit}
	onCancel={closeResubmitForm}
	{isSubmitting}
	{minGasPrice}
	errorMessage={resubmitError}
/>

<ConfirmCancelDialog
	open={showCancelConfirm}
	onConfirm={handleCancel}
	onCancel={closeCancelConfirm}
	{isSubmitting}
	errorMessage={cancelError}
/>

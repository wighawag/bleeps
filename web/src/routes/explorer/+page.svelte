<script lang="ts">
	import {goto} from '$app/navigation';
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import * as Card from '$lib/shadcn/ui/card';
	import * as Separator from '$lib/shadcn/ui/separator';
	import {Input} from '$lib/shadcn/ui/input';
	import {Button} from '$lib/shadcn/ui/button';
	import SearchIcon from '@lucide/svelte/icons/search';
	import TransactionList from './components/TransactionList.svelte';
	import {classifySearchInput} from './lib/utils';
	import {route} from '$lib';

	let inputValue = $state('');

	function handleSearch() {
		const result = classifySearchInput(inputValue);
		if (result.kind === 'tx') {
			goto(route(`/explorer/tx/${result.value}`));
		} else if (result.kind === 'address') {
			goto(route(`/explorer/address/${result.value}`));
		} else if (result.kind === 'invalid') {
			alert('Invalid address or transaction hash format');
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSearch();
		}
	}
</script>

<DefaultHead title={'Explorer'} />

<div class="container mx-auto max-w-5xl px-4 py-8">
	<div class="space-y-6">
		<div class="flex flex-col items-center space-y-2">
			<div class="rounded-full bg-primary/10 p-3">
				<SearchIcon class="h-8 w-8 text-primary" />
			</div>
			<h1 class="text-3xl font-bold">Blockchain Explorer</h1>
			<p class="text-muted-foreground">
				Search for transactions and addresses on the blockchain
			</p>
		</div>

		<Separator.Root />

		<Card.Root class="mx-auto max-w-2xl">
			<Card.Content class="pt-6">
				<div class="flex gap-2">
					<Input
						bind:value={inputValue}
						onkeydown={handleKeydown}
						placeholder="Enter transaction hash or address (0x...)"
						class="flex-1"
					/>
					<Button onclick={handleSearch}>
						<SearchIcon class="mr-2 h-4 w-4" />
						Search
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Recent Transactions -->
		<TransactionList />
	</div>
</div>

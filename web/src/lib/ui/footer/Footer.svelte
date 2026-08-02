<script lang="ts">
	import {url} from '$lib/core/utils/web/path';
	import {
		DISCORD_URL,
		MAINNET_CONTRACTS,
		REPO_URL,
		TWITTER_URL,
		etherscanAddress,
	} from '$lib/mainnet';
	import DiscordIcon from '$lib/icons/DiscordIcon.svelte';
	import TwitterIcon from '$lib/icons/TwitterIcon.svelte';
	import GitHubIcon from '$lib/icons/GitHubIcon.svelte';

	// The wording is the pre-template site's, and the addresses are mainnet's
	// wherever this is built: the footer describes the project, not the chain the
	// app is pointed at. See lib/mainnet.ts.
</script>

<footer class="mt-16 bg-black" aria-labelledby="footerHeading">
	<div
		class="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16"
	>
		<div class="border-t border-gray-700 pt-8 text-gray-400">
			<p class="mt-4 p-1">
				The source code can be found
				<a href={REPO_URL} target="_blank" class="underline">here</a>
			</p>

			{#each MAINNET_CONTRACTS as contract (contract.address)}
				<p class="p-1">
					{contract.label} is
					<a
						href={etherscanAddress(contract.address)}
						target="_blank"
						class="text-xs break-all underline sm:text-base"
						>{contract.address}</a
					>
				</p>
			{/each}

			<p class="mt-4 p-1">
				This project was created by
				<a href="https://ronan.eth.limo" target="_blank" class="underline"
					>Ronan Sandford</a
				>
				(a.k.a
				<a href="https://twitter.com/wighawag" target="_blank" class="underline"
					>wighawag
					<img
						class="inline h-4 w-4"
						alt="wighawag"
						src={url('/images/wig256x256.jpg')}
					/></a
				>)
			</p>

			<p class="p-1">
				Web Design by
				<a class="underline" target="_blank" href="https://vanhullebus.ch/"
					>Buche</a
				>
				(<a
					class="underline"
					target="_blank"
					href="https://twitter.com/BucheMakesGames">@BucheMakesGames</a
				>)
			</p>

			<div class="mt-6 flex justify-center gap-6">
				<a
					href={TWITTER_URL}
					target="_blank"
					class="text-gray-400 hover:text-gray-300"
				>
					<span class="sr-only">Twitter</span>
					<TwitterIcon class="h-6 w-6" />
				</a>
				<a
					href={REPO_URL}
					target="_blank"
					class="text-gray-400 hover:text-gray-300"
				>
					<span class="sr-only">GitHub</span>
					<GitHubIcon class="h-6 w-6" />
				</a>
				<a
					href={DISCORD_URL}
					target="_blank"
					class="text-gray-400 hover:text-gray-300"
				>
					<span class="sr-only">Discord</span>
					<DiscordIcon class="h-7 w-7" />
				</a>
			</div>
		</div>
	</div>
</footer>

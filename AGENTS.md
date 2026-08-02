# setup

`pnpm i`

# frontend

in ./web
for typescript checks: `pnpm check`
for tests: `pnpm test`

## Svelte conventions

- **`.svelte` files must be logic-less or logic-minimal.** They should only
  render UI and wire props/stores together. Small presentational conveniences
  are fine (a display formatter, a class toggle, a UI-only animation, local
  open/closed modal state). Anything else, business/domain logic, async
  blockchain calls, transaction building, balance checks, data
  fetching/derivation, non-trivial computation, filtering/sorting/aggregating
  domain data, network error handling, belongs in a plain `.ts` module (a
  helper, a store, or a service) that the component imports.

- **Never create `.svelte.ts` files.** Do not use Svelte runes
  (`$state`, `$derived`, `$effect`, ...) outside of `.svelte` components. Put
  reusable logic in plain `.ts` files and expose reactivity with Svelte stores
  (`writable`/`readable`/`derived` from `svelte/store`). Components consume
  those stores with the `$store` syntax and own any `$effect`/lifecycle wiring
  themselves.

- Logic lives in `.ts`, reactivity crosses the boundary as stores. Prefer
  factory functions that return `{subscribe, ...actions}` (see the existing
  stores under `src/lib/**` and `src/routes/**/lib/stores/`).

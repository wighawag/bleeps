# Contributing Guide

This guide provides an overview for contributing to this full-stack onchain application template. For detailed, package-specific guidance, see the individual contributing guides:

- **[Web Frontend Guide](./web/CONTRIBUTING.md)** - SvelteKit frontend development
- **[Contracts Guide](./contracts/CONTRIBUTING.md)** - Smart contract development

---

## Project Structure

```
.
├── contracts/                    # Smart contracts package
│   ├── src/                      # Solidity contracts
│   ├── deploy/                   # Deployment scripts
│   ├── test/                     # Hardhat tests (TypeScript)
│   ├── rocketh/                  # Rocketh configuration
│   └── generated/                # Auto-generated ABI types
├── web/                          # SvelteKit frontend
│   ├── src/
│   │   ├── lib/                  # Shared components & utilities
│   │   ├── routes/               # SvelteKit routes
│   │   └── service-worker/       # PWA service worker
│   ├── test/                     # Unit tests
│   └── e2e/                      # E2E tests (Playwright)
├── dev/                          # Zellij layout configurations
├── package.json                  # Root monorepo configuration
└── pnpm-workspace.yaml           # PNPM workspace definition
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Zellij](https://zellij.dev/) (optional, for `pnpm start`)

### Installation

```bash
pnpm i
```

### Development

```bash
# Full local development (requires Zellij)
pnpm start

# Or run services individually:
pnpm contracts:node:local        # Start local Ethereum node
pnpm contracts:compile:watch     # Auto-compile contracts
pnpm contracts:deploy:watch      # Auto-deploy on changes
pnpm web:dev                     # Start frontend dev server
```

---

## Architecture Overview

### Tech Stack

| Package | Framework | Key Libraries |
|---------|-----------|---------------|
| **Contracts** | Hardhat v3 | rocketh, viem, Foundry |
| **Web** | SvelteKit 2 | Svelte 5, Tailwind CSS 4, shadcn-svelte |

### Key Patterns

#### Contracts

- **Proxy Pattern**: ERC1967 via `@rocketh/proxy`
- **Dual Testing**: Foundry (Solidity) + Hardhat (TypeScript)
- **Declarative Deployment**: `deployViaProxy` with tagged scripts
- **Named Accounts**: Clean account management via config

#### Web

- **Svelte 5 Runes**: `$state()`, `$derived()`, `$props()`
- **Dual-Store Architecture**: Data store + status store
- **Context Pattern**: Services via `createContext()`
- **No Globals**: Browser APIs guarded with `typeof window` checks

---

## Development Workflow

### 1. Smart Contract Changes

```bash
cd contracts

# Edit contracts
# src/YourContract/YourContract.sol

# Compile
pnpm compile

# Run tests
pnpm test

# Deploy locally
pnpm hardhat --network local deploy --skip-prompts

# Export to frontend
pnpm rocketh-export -e localhost --ts ../web/src/lib/deployments.ts
```

### 2. Frontend Changes

```bash
cd web

# Edit components
# src/routes/YourFeature/+page.svelte

# Type check
pnpm check

# Run tests
pnpm test

# Start dev server
pnpm dev
```

### 3. Full-Stack Changes

When working on both contracts and frontend:

```bash
# Terminal 1: Contracts watch
cd contracts && pnpm compile:watch

# Terminal 2: Deploy watch
cd contracts && pnpm deploy:watch

# Terminal 3: Frontend dev
cd web && pnpm dev
```

Or use Zellij:
```bash
pnpm start
```

---

## Code Style

### General

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Formatting**: Prettier with project defaults
- **Naming**: Clear, descriptive names (no abbreviations)

### Contracts

- **Solidity**: `^0.8.28` pragma across all files
- **Interfaces**: Separate `I<Contract>.sol` files
- **Errors**: Custom errors instead of require strings
- **Events**: Emit for all state changes
- **NatSpec**: Document public/external functions

### Web

- **Svelte**: Svelte 5 runes (no legacy patterns)
- **Components**: Small, composable, single responsibility
- **Stores**: Dual-store pattern (data + status)
- **Imports**: Use `$lib` alias, namespace imports for shadcn

---

## Testing

### Contracts

```bash
# All tests (Hardhat + Foundry)
pnpm contracts:test

# Hardhat tests only
cd contracts && pnpm test

# Foundry tests only
cd contracts && forge test

# Watch mode
cd contracts && pnpm test:watch
```

### Web

```bash
# Unit tests
cd web && pnpm test

# E2E tests
cd web && pnpm test:e2e

# Watch mode
cd web && pnpm test:watch
```

---

## Deployment

### Local Development

```bash
# Deploy to localhost
pnpm contracts:deploy localhost --skip-prompts

# Export to frontend
pnpm contracts:export localhost --ts ../web/src/lib/deployments.ts
```

### Testnet/Mainnet

```bash
# 1. Configure environment
cd contracts
# Add to .env.local:
# ETH_NODE_URI_sepolia="https://..."
# MNEMONIC_sepolia="your mnemonic"
# ETHERSCAN_API_KEY="your-key"

# 2. Deploy
pnpm contracts:deploy sepolia

# 3. Verify
pnpm contracts:verify sepolia

# 4. Export to frontend
pnpm contracts:export sepolia --ts ../web/src/lib/deployments.ts
```

---

## Environment Setup

### Contracts

Create `contracts/.env.local` (gitignored):

```bash
# RPC endpoints
ETH_NODE_URI_sepolia="https://..."
ETH_NODE_URI_mainnet="https://..."

# Mnemonics
MNEMONIC_sepolia="your mnemonic"
MNEMONIC="fallback mnemonic"

# Etherscan API key
ETHERSCAN_API_KEY="your-api-key"
```

### Web

Create `web/.env.local` (gitignored):

```bash
# Backend API URL (if applicable)
PUBLIC_BACKEND_URL="http://localhost:3000"
```

---

## Adding New Features

### Full-Stack Feature

1. **Create contract**:
   ```bash
   cd contracts
   mkdir -p src/YourFeature
   # Write contract, interface, tests
   # Write deployment script
   ```

2. **Deploy and export**:
   ```bash
   pnpm contracts:deploy localhost --skip-prompts
   pnpm contracts:export localhost --ts ../web/src/lib/deployments.ts
   ```

3. **Create frontend**:
   ```bash
   cd web
   mkdir -p src/routes/your-feature
   # Write components, stores, page
   ```

4. **Test end-to-end**:
   ```bash
   cd web
   pnpm test:e2e
   ```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm start` | Full local development (Zellij) |
| `pnpm build <network>` | Build contracts + web for production |
| `pnpm contracts:compile` | Compile contracts |
| `pnpm contracts:test` | Run all contract tests |
| `pnpm contracts:deploy <network>` | Deploy to network |
| `pnpm contracts:export <network>` | Export deployments to frontend |
| `pnpm web:dev` | Start frontend dev server |
| `pnpm web:build` | Build frontend for production |
| `pnpm test` | Run all tests |
| `pnpm format` | Format all code |

---

## Git Workflow

### Branches

- `main` - Stable, production-ready code
- `dev` - Development branch (if using)
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `chore/<name>` - Maintenance tasks

### Commits

Follow conventional commits:

```
feat: add new feature
fix: fix bug in contract
docs: update documentation
chore: update dependencies
test: add tests
refactor: improve code structure
```

### Pull Requests

1. Create branch from `main`
2. Make changes with tests
3. Run lint and tests
4. Create PR with description
5. Request review
6. Merge after approval

---

## Troubleshooting

### Contracts Not Compiling

```bash
cd contracts
rm -rf cache artifacts generated
pnpm compile
```

### Frontend Type Errors

```bash
cd web
rm -rf .svelte-kit node_modules
pnpm i
pnpm check
```

### Deployment Issues

1. Check `.env.local` configuration
2. Verify network is running: `pnpm contracts:node:local`
3. Clear deployments: `rm -rf contracts/deployments/localhost`
4. Redeploy: `pnpm contracts:deploy localhost --skip-prompts`

### Test Failures

```bash
# Clear cache and rerun
cd contracts
rm -rf cache
pnpm test

# Or for frontend
cd web
pnpm test -- --clear-cache
```

---

## Resources

### Documentation

- [Web Contributing Guide](./web/CONTRIBUTING.md)
- [Contracts Contributing Guide](./contracts/CONTRIBUTING.md)
- [Main README](./README.md)

### External

- [Svelte 5 Docs](https://svelte.dev/docs/svelte/v5-migration-guide)
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Hardhat v3 Docs](https://hardhat.org/docs)
- [rocketh Docs](https://github.com/wighawag/hardhat-deploy/tree/v2#readme)
- [Foundry Book](https://book.getfoundry.sh/)
- [Tailwind CSS 4](https://tailwindcss.com/docs)

---

## Questions?

- Check existing issues on GitHub
- Review the [AGENTS.md](./AGENTS.md) for AI assistant guidance
- Consult package-specific contributing guides

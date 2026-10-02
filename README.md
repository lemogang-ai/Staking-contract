# Staking Contract (UUPS Upgradeable)

[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.4-yellow?style=flat-square&logo=ethereum)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.0-4E5EE4?style=flat-square&logo=openzeppelin)](https://openzeppelin.com/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

An ERC-20 staking protocol with Synthetix-style reward distribution, UUPS proxy upgradeability, time-locked withdrawals with dev fees, and a React + Vite web dashboard.

---

## Features

- **UUPS Upgradeable**: Logic contracts can be upgraded via OpenZeppelin's UUPS proxy while preserving all state and balances.
- **Synthetix Reward Accrual**: Constant $O(1)$ gas complexity reward calculation per second.
- **Timelock & Fee Mechanics**: Configurable lock duration before unstaking is permitted. A 10% dev fee is deducted on withdrawal and sent to `devWallet` (90% returned to user).
- **Admin Management**: Scripts to easily mint test tokens, fund rewards, and notify reward schedules.
- **Interactive Web UI**: React + Vite frontend with MetaMask connection, real-time lock countdown, and one-click stake/claim/unstake actions.

---

## Project Structure

```text
├── contracts/
│   ├── StakingRewardsUpgradeable.sol   # Main UUPS staking contract
│   └── MockToken.sol                   # ERC-20 test token
├── scripts/
│   ├── deploy.js                       # Deploys UUPS proxy & implementation
│   ├── fund-contract.js                # Funds reward pool
│   ├── notify.js                       # Starts/updates reward distribution schedule
│   ├── mint.js                         # Mints test tokens (testnet)
│   └── upgrade.js                      # Upgrades proxy implementation
├── test/
│   └── StakingContract.test.js         # Full suite of unit & upgrade tests
├── frontend/                           # React + Vite application
│   └── src/
│       ├── components/StakingApp.jsx   # Staking dashboard & lock countdown
│       └── config/contracts.js         # Contract addresses & ABIs
└── hardhat.config.js                   # Hardhat network & compiler configuration
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint (Alchemy / Infura) |
| `PRIVATE_KEY` | Deployer / Owner wallet private key |
| `ETHERSCAN_API_KEY` | Etherscan API key for contract verification |
| `TOKEN_ADDRESS` | ERC-20 token address used for staking & rewards |
| `LOCK_DURATION` | Lock period in seconds (e.g. `60` for test, `604800` for 7 days) |
| `REWARDS_DURATION` | Reward distribution duration in seconds (e.g. `86400` = 1 day) |

### 3. Compile & Test

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

---

## Deployment & Admin Lifecycle

### Deploy Locally

```bash
# Terminal 1: Start node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Protocol Operations (Sepolia / Testnet)

1. **Mint tokens** to deployer wallet:
   ```bash
   npx hardhat run scripts/mint.js --network sepolia
   ```
2. **Fund rewards pool** (transfers tokens into staking contract):
   ```bash
   npx hardhat run scripts/fund-contract.js --network sepolia
   ```
3. **Notify rewards** (activates reward schedule):
   ```bash
   npx hardhat run scripts/notify.js --network sepolia
   ```

### Upgrading the Contract (UUPS)

To deploy and point the proxy to a new implementation:

```bash
npx hardhat run scripts/upgrade.js --network sepolia
```

### Contract Verification

```bash
npx hardhat verify --network sepolia <DEPLOYED_CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Frontend Web App

1. Enter your contract addresses in `frontend/src/config/contracts.js`:
   ```javascript
   export const STAKING_CONTRACT_ADDRESS = '0x...';
   export const STAKING_TOKEN_ADDRESS = '0x...';
   ```

2. Start the development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173) to connect MetaMask and interact with the staking pool.

---

## Deployed Contracts (Sepolia)

| Contract | Address | Explorer |
|---|---|---|
| **StakingRewards (Proxy)** | `0x5D03049E1DFa6Ffe799b599F13B576D5BEf99474` | [Etherscan](https://sepolia.etherscan.io/address/0x5D03049E1DFa6Ffe799b599F13B576D5BEf99474) |
| **MockToken (MTK)** | `0x0D15D5f0781367938B8C2437A1F86ac3B810Bb8c` | [Etherscan](https://sepolia.etherscan.io/address/0x0D15D5f0781367938B8C2437A1F86ac3B810Bb8c) |

---

## License

Released under the [MIT License](https://opensource.org/licenses/MIT). Scaffolded with [abc-scaffold](https://github.com/africas-blockchain-club/abc-scaffold).

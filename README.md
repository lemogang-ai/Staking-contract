# staking-contract

> Scaffolded with [abc-scaffold](https://github.com/africas-blockchain-club/abc-scaffold) by **Africa's Blockchain Club**

A project-agnostic Hardhat workspace ready for smart contract development, testing, and frontend integration. Build anything — NFTs, DeFi protocols, DAOs, smart accounts, or any on-chain application.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| MetaMask | Latest |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your values in `.env`:

- `SEPOLIA_RPC_URL` — get one free from [Infura](https://infura.io) or [Alchemy](https://alchemy.com)
- `PRIVATE_KEY` — your deployer wallet private key (**never commit this file**)
- `ETHERSCAN_API_KEY` — for contract verification on [Etherscan](https://etherscan.io)

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Run tests

```bash
npx hardhat test
```

### 5. Deploy contracts locally

Open two terminals:

```bash
# Terminal 1 — start a local node
npx hardhat node

# Terminal 2 — deploy your contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Directory Structure

```
staking-contract/
├── contracts/          # Solidity smart contracts
├── scripts/            # Deployment and utility scripts
├── test/               # Hardhat test files
├── frontend/           # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       └── components/
│           └── Navbar.jsx   ← Connect Wallet button lives here
├── hardhat.config.js   # Hardhat configuration
├── .env.example        # Environment variable template
└── README.md
```

---

## Writing Smart Contracts

Place your Solidity files in `contracts/`. The config targets Solidity `0.8.26` with the Cancun EVM and the optimizer enabled (200 runs).

**Example** — `contracts/MyContract.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MyContract {
    // Your logic here
}
```

### Included libraries

| Package | Use case |
|---------|----------|
| `@openzeppelin/contracts` | ERC-20, ERC-721, ERC-1155, access control, etc. |
| `@openzeppelin/contracts-upgradeable` | UUPS / Transparent proxy upgradeable variants |
| `@openzeppelin/hardhat-upgrades` | Deploy and upgrade helper tasks |
| `@account-abstraction/contracts` | ERC-4337 interfaces and EntryPoint |

---

## Writing Tests

Place test files in `test/`. Hardhat ships with Mocha + Chai.

**Example** — `test/MyContract.test.js`:

```javascript
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MyContract', function () {
  it('should deploy successfully', async function () {
    const MyContract = await ethers.getContractFactory('MyContract');
    const contract = await MyContract.deploy();
    expect(await contract.getAddress()).to.not.equal(ethers.ZeroAddress);
  });
});
```

---

## Writing Deployment Scripts

**Example** — `scripts/deploy.js`:

```javascript
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying from:', deployer.address);

  const MyContract = await ethers.getContractFactory('MyContract');
  const contract = await MyContract.deploy();
  await contract.waitForDeployment();

  console.log('MyContract deployed to:', await contract.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

---

## Networks

| Network | RPC | Chain ID |
|---------|-----|----------|
| Hardhat (local) | `http://127.0.0.1:8545` | 31337 |
| Sepolia (testnet) | `SEPOLIA_RPC_URL` in `.env` | 11155111 |

---

## Verifying Contracts

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Frontend

The `frontend/` folder is a Vite + React app with:

- A sticky navigation bar with a **Connect Wallet** button (MetaMask / EIP-1193)
- Ethers.js v6 already wired up

### Connecting to a deployed contract

Copy the ABI from `artifacts/contracts/YourContract.sol/YourContract.json` and import it:

```javascript
import { BrowserProvider, Contract } from 'ethers';
import MyContractABI from '../../artifacts/contracts/MyContract.sol/MyContract.json';

const CONTRACT_ADDRESS = '0x...';

async function interact() {
  const provider = new BrowserProvider(window.ethereum);
  const signer   = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, MyContractABI.abi, signer);
  // call contract methods here
}
```

---

## Resources

- [Hardhat Docs](https://hardhat.org/docs)
- [Solidity Docs](https://docs.soliditylang.org)
- [OpenZeppelin Docs](https://docs.openzeppelin.com)
- [EIP-4337 (Account Abstraction)](https://eips.ethereum.org/EIPS/eip-4337)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6)
- [Vite Docs](https://vitejs.dev)

---

*Built with Africa's Blockchain Club — scaffold your next project with `npx abc-scaffold`.*

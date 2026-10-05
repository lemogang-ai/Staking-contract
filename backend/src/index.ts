import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
import {ethers} from "ethers";

dotenv.config();

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

const STAKED_EVENT = parseAbiItem(
  "event Staked(address indexed user, uint256 amount)"
);

async function startIndexer() {
  const currentBlock = await publicClient.getBlockNumber();
  const startBlock = BigInt(process.env.DEPLOYMENT_BLOCK || currentBlock);
  const CHUNK_SIZE = 10n; // Alchemy Free Tier Limit

  console.log(`🔍 Syncing historical events from block ${startBlock} to ${currentBlock}...`);

  let currentFrom = startBlock;

  // Phase 1: Historical Chunked Sync
  while (currentFrom <= currentBlock) {
    const currentTo =
      currentFrom + CHUNK_SIZE - 1n > currentBlock
        ? currentBlock
        : currentFrom + CHUNK_SIZE - 1n;

    // Add progress visibility every few chunks
    if (currentFrom % 100n === 0n || currentFrom === startBlock) {
      console.log(`⏳ Processing blocks ${currentFrom} to ${currentTo}...`);
    }

    try {
      const logs = await publicClient.getLogs({
        address: process.env.STAKING_PROXY_ADDRESS as `0x${string}`,
        event: STAKED_EVENT,
        fromBlock: currentFrom,
        toBlock: currentTo,
      });

      for (const log of logs) {
        console.log(
          `[HISTORICAL] User: ${log.args.user} | Amount: ${log.args.amount} | Block: ${log.blockNumber}`
        );
      }
    } catch (error) {
      console.error(`Error fetching chunk [${currentFrom} - ${currentTo}]:`, error);
      break;
    }

    currentFrom = currentTo + 1n;
  }

  console.log("✅ Historical sync complete!");

  // Phase 2: Live Event Watching
  console.log("⚡ Listening for live on-chain events...");
  publicClient.watchContractEvent({
    address: process.env.STAKING_PROXY_ADDRESS as `0x${string}`,
    abi: [STAKED_EVENT],
    eventName: "Staked",
    onLogs: (logs) => {
      for (const log of logs) {
        console.log(
          `[LIVE] User: ${log.args.user} | Amount: ${log.args.amount} | Tx: ${log.transactionHash}`
        );
      }
    },
  });

   // Example: Processing raw logs into structured DB records
  async function processStakedEvent(user: string, amount: bigint, blockNumber: bigint, txHash: string) {
    const formattedAmount = ethers.formatEther(amount);
    
    // 1. Update user's aggregate staked balance in DB
    // 2. Append transaction record to historical timeline
    console.log(`[DB SAVE] User: ${user} | Amount: ${formattedAmount} ETH | Block: ${blockNumber}`);
  }

}

startIndexer().catch(console.error);
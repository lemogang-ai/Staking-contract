import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { prisma } from "./db";
import { getLastSyncedBlock, recordEvent, updateLastSyncedBlock } from "./services/indexerService";

dotenv.config();

const address = process.env.STAKING_PROXY_ADDRESS;
if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
  throw new Error("Set STAKING_PROXY_ADDRESS to the deployed staking proxy address.");
}
const contractAddress = address as `0x${string}`;
const deploymentBlock = process.env.DEPLOYMENT_BLOCK;
if (!deploymentBlock || !/^\d+$/.test(deploymentBlock)) {
  throw new Error("Set DEPLOYMENT_BLOCK to the proxy deployment block for complete history.");
}

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL || undefined),
});

const events = [
  parseAbiItem("event Staked(address indexed user, uint256 amount)"),
  parseAbiItem("event Withdrawn(address indexed user, uint256 amount)"),
  parseAbiItem("event RewardPaid(address indexed user, uint256 reward)"),
  parseAbiItem("event RewardAdded(uint256 reward)"),
] as const;

async function persistLog(log: any): Promise<void> {
  if (!log.transactionHash || log.blockNumber === null || log.logIndex === null) {
    throw new Error("Received an incomplete contract log; refusing to advance sync state.");
  }
  const user = log.args.user as string | undefined;
  const amount = (log.args.amount ?? log.args.reward) as bigint;
  const typeByName: Record<string, "STAKED" | "WITHDRAWN" | "REWARD_PAID" | "REWARD_ADDED"> = {
    Staked: "STAKED",
    Withdrawn: "WITHDRAWN",
    RewardPaid: "REWARD_PAID",
    RewardAdded: "REWARD_ADDED",
  };
  const type = typeByName[log.eventName];
  if (!type || typeof amount !== "bigint") throw new Error(`Unsupported event: ${log.eventName}`);

  await recordEvent({
    id: `${log.transactionHash}_${log.logIndex}`,
    type,
    userAddress: user,
    amount,
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
  });
}

async function syncLoop(): Promise<void> {
  const start = BigInt(deploymentBlock!);
  const savedCursor = await getLastSyncedBlock(start - 1n);
  // A persisted cursor can predate a changed deployment block or a fresh DB.
  // Never query logs from before this proxy existed.
  let cursor = savedCursor < start - 1n ? start - 1n : savedCursor;
  if (cursor !== savedCursor) await updateLastSyncedBlock(cursor);
  const chunkSize = 10n;
  console.log(`[Indexer] Resuming after block ${cursor}; deployment block ${start}.`);

  for (;;) {
    try {
      const head = await client.getBlockNumber();
      while (cursor < head) {
        const fromBlock = cursor + 1n;
        const toBlock = fromBlock + chunkSize - 1n > head ? head : fromBlock + chunkSize - 1n;
        const logs = await client.getLogs({
          address: contractAddress,
          events,
          fromBlock,
          toBlock,
        });
        for (const log of logs) await persistLog(log);

        // Cursor advances only after every log and its aggregate have committed.
        await updateLastSyncedBlock(toBlock);
        cursor = toBlock;
        console.log(`[Indexer] Persisted blocks ${fromBlock}-${toBlock} (${logs.length} events).`);
      }
    } catch (error) {
      console.error("[Indexer] Sync failed; cursor retained for retry:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", async (_req, res) => {
  try {
    const state = await prisma.syncState.findUnique({ where: { id: "staking_sync" } });
    res.json({ success: true, lastSyncedBlock: state?.lastSyncedBlock.toString() ?? null });
  } catch {
    res.status(503).json({ success: false, error: "Database unavailable" });
  }
});

app.get("/api/v1/user/:address/activity", async (req, res) => {
  const userAddress = req.params.address.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(userAddress)) {
    res.status(400).json({ success: false, error: "Invalid wallet address" });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  try {
    const [history, count] = await Promise.all([
      prisma.stakingEvent.findMany({
        where: { userAddress },
        orderBy: [{ blockNumber: "desc" }, { id: "desc" }],
        take: limit,
      }),
      prisma.stakingEvent.count({ where: { userAddress } }),
    ]);
    res.json({
      success: true,
      user: userAddress,
      count,
      history: history.map((event) => ({
        type: event.type,
        amount: event.amount,
        blockNumber: event.blockNumber.toString(),
        transactionHash: event.txHash,
        timestamp: event.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API] Activity query failed:", error);
    res.status(500).json({ success: false, error: "Could not load activity" });
  }
});

app.get("/api/v1/user/:address/stats", async (req, res) => {
  const userAddress = req.params.address.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(userAddress)) {
    res.status(400).json({ success: false, error: "Invalid wallet address" });
    return;
  }
  try {
    const stats = await prisma.userStat.findUnique({ where: { userAddress } });
    res.json({
      success: true,
      user: userAddress,
      stats: stats ? { ...stats, lastActiveBlock: stats.lastActiveBlock.toString() } : null,
    });
  } catch (error) {
    console.error("[API] Stats query failed:", error);
    res.status(500).json({ success: false, error: "Could not load user stats" });
  }
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`[API] Listening on http://localhost:${port}`));
syncLoop().catch((error) => {
  console.error("[Indexer] Fatal error:", error);
  process.exitCode = 1;
});

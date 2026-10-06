import { prisma } from "../db";

const SYNC_ID = "staking_sync";

export async function getLastSyncedBlock(fallbackBlock: bigint): Promise<bigint> {
  const state = await prisma.syncState.upsert({
    where: { id: SYNC_ID },
    update: {},
    create: { id: SYNC_ID, lastSyncedBlock: fallbackBlock },
  });
  return state.lastSyncedBlock;
}

export async function updateLastSyncedBlock(blockNumber: bigint): Promise<void> {
  await prisma.syncState.upsert({
    where: { id: SYNC_ID },
    update: { lastSyncedBlock: blockNumber },
    create: { id: SYNC_ID, lastSyncedBlock: blockNumber },
  });
}

export async function recordEvent(params: {
  id: string;
  type: "STAKED" | "WITHDRAWN" | "REWARD_PAID" | "REWARD_ADDED";
  userAddress?: string;
  amount: bigint;
  blockNumber: bigint;
  txHash: string;
}): Promise<void> {
  const userAddress = params.userAddress?.toLowerCase() ?? null;

  await prisma.$transaction(async (tx) => {
    // Only apply the aggregate once, even if a block is replayed after restart.
    const existing = await tx.stakingEvent.findUnique({ where: { id: params.id } });
    if (existing) return;

    await tx.stakingEvent.create({
      data: {
        id: params.id,
        type: params.type,
        userAddress,
        amount: params.amount.toString(),
        blockNumber: params.blockNumber,
        txHash: params.txHash,
      },
    });

    if (!userAddress) return;
    const current = await tx.userStat.findUnique({ where: { userAddress } });
    let currentStaked = BigInt(current?.currentStaked ?? "0");
    let totalStaked = BigInt(current?.totalStaked ?? "0");
    let totalWithdrawn = BigInt(current?.totalWithdrawn ?? "0");
    let totalClaimed = BigInt(current?.totalClaimed ?? "0");

    if (params.type === "STAKED") {
      currentStaked += params.amount;
      totalStaked += params.amount;
    } else if (params.type === "WITHDRAWN") {
      currentStaked = currentStaked >= params.amount ? currentStaked - params.amount : 0n;
      totalWithdrawn += params.amount;
    } else if (params.type === "REWARD_PAID") {
      totalClaimed += params.amount;
    }

    await tx.userStat.upsert({
      where: { userAddress },
      update: {
        currentStaked: currentStaked.toString(),
        totalStaked: totalStaked.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalClaimed: totalClaimed.toString(),
        lastActiveBlock: params.blockNumber,
      },
      create: {
        userAddress,
        currentStaked: currentStaked.toString(),
        totalStaked: totalStaked.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalClaimed: totalClaimed.toString(),
        lastActiveBlock: params.blockNumber,
      },
    });
  });
}

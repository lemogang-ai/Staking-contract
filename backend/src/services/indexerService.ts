import { prisma } from "../db";
    
const SYNC_ID = "staking_sync";

/**
 * Retrieves the last block number processed by the indexer.
 * If running for the first time, initializes it with fallbackBlock.
 */
export async function getLastSyncedBlock(fallbackBlock: bigint): Promise<bigint> {
    const state = await prisma.syncState.findUnique({
    where: { id: SYNC_ID },
    });

    if (!state) {
    await prisma.syncState.create({
        data: {
        id: SYNC_ID,
        lastSyncedBlock: fallbackBlock,
        },
    });
    return fallbackBlock;
    }

    return state.lastSyncedBlock;
}

/**
 * Updates the sync cursor to the most recently completed block.
 */
export async function updateLastSyncedBlock(blockNumber: bigint): Promise<void> {
    await prisma.syncState.upsert({
    where: { id: SYNC_ID },
    update: { lastSyncedBlock: blockNumber },
    create: { id: SYNC_ID, lastSyncedBlock: blockNumber },
    });
}

/**
 * Records an on-chain event idempotently (preventing duplicates if re-indexed)
 */
export async function recordEvent(params: {
    id: string;
    type: "STAKED" | "WITHDRAWN" | "REWARD_PAID" | "REWARD_ADDED";
    userAddress?: string;
    amount: bigint;
    blockNumber: bigint;
    txHash: string;
}): Promise<void> {
    const normalizedUser = params.userAddress ? params.userAddress.toLowerCase() : null;

    // 1. Save the immutable event
    await prisma.stakingEvent.upsert({
    where: { id: params.id },
    update: {}, // If already recorded, do nothing (idempotent)
    create: {
        id: params.id,
        type: params.type,
        userAddress: normalizedUser,
        amount: params.amount.toString(),
        blockNumber: params.blockNumber,
        txHash: params.txHash,
    },
    });

    // 2. If it's a user event, update their aggregate stats
    if (normalizedUser) {
    const existing = await prisma.userStat.findUnique({
        where: { userAddress: normalizedUser },
    });

    let current = existing ? BigInt(existing.currentStaked) : 0n;
    let totalStaked = existing ? BigInt(existing.totalStaked) : 0n;
    let totalWithdrawn = existing ? BigInt(existing.totalWithdrawn) : 0n;
    let totalClaimed = existing ? BigInt(existing.totalClaimed) : 0n;

    if (params.type === "STAKED") {
        current += params.amount;
        totalStaked += params.amount;
    } else if (params.type === "WITHDRAWN") {
        current = current >= params.amount ? current - params.amount : 0n;
        totalWithdrawn += params.amount;
    } else if (params.type === "REWARD_PAID") {
        totalClaimed += params.amount;
    }

    await prisma.userStat.upsert({
        where: { userAddress: normalizedUser },
        update: {
        currentStaked: current.toString(),
        totalStaked: totalStaked.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalClaimed: totalClaimed.toString(),
        lastActiveBlock: params.blockNumber,
        },
        create: {
        userAddress: normalizedUser,
        currentStaked: current.toString(),
        totalStaked: totalStaked.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalClaimed: totalClaimed.toString(),
        lastActiveBlock: params.blockNumber,
        },
    });
    }
}
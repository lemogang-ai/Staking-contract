-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'staking_sync',
    "lastSyncedBlock" BIGINT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StakingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "userAddress" TEXT,
    "amount" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "txHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserStat" (
    "userAddress" TEXT NOT NULL PRIMARY KEY,
    "totalStaked" TEXT NOT NULL DEFAULT '0',
    "totalWithdrawn" TEXT NOT NULL DEFAULT '0',
    "totalClaimed" TEXT NOT NULL DEFAULT '0',
    "currentStaked" TEXT NOT NULL DEFAULT '0',
    "lastActiveBlock" BIGINT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "StakingEvent_userAddress_idx" ON "StakingEvent"("userAddress");

-- CreateIndex
CREATE INDEX "StakingEvent_type_idx" ON "StakingEvent"("type");

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "token1" TEXT NOT NULL,
    "token2" TEXT NOT NULL,
    "lpProtocol" TEXT NOT NULL,
    "perpVenue" TEXT NOT NULL,
    "startingCapitalUsd" REAL NOT NULL,
    "openDate" DATETIME NOT NULL,
    "pa" REAL NOT NULL,
    "pb" REAL NOT NULL,
    "priceMoveThresholdPct" REAL NOT NULL DEFAULT 0.02,
    "deltaDriftThresholdPct" REAL NOT NULL DEFAULT 0.10,
    "crossPositionRebalanceThresholdPct" REAL NOT NULL DEFAULT 0.20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token1Price" REAL NOT NULL,
    "token2Price" REAL NOT NULL,
    "lpPrice" REAL NOT NULL,
    "lpToken1Amount" REAL NOT NULL,
    "lpToken2Amount" REAL NOT NULL,
    "lpValueUsd" REAL NOT NULL,
    "lpToken1FeesEarned" REAL NOT NULL DEFAULT 0,
    "lpToken2FeesEarned" REAL NOT NULL DEFAULT 0,
    "lpFeesUsd" REAL NOT NULL DEFAULT 0,
    "lpPnlUsd" REAL NOT NULL,
    "hedge1PositionSize" REAL NOT NULL,
    "hedge1EntryPrice" REAL NOT NULL,
    "hedge1Leverage" REAL NOT NULL,
    "hedge1MarginUsd" REAL NOT NULL,
    "hedge1PnlUsd" REAL NOT NULL,
    "hedge1LiquidationPrice" REAL,
    "hedge2PositionSize" REAL NOT NULL,
    "hedge2EntryPrice" REAL NOT NULL,
    "hedge2Leverage" REAL NOT NULL,
    "hedge2MarginUsd" REAL NOT NULL,
    "hedge2PnlUsd" REAL NOT NULL,
    "hedge2LiquidationPrice" REAL,
    "accountEquityUsd" REAL NOT NULL,
    "marginUsedUsd" REAL NOT NULL,
    "fundingPaidUsd" REAL NOT NULL DEFAULT 0,
    "totalHedgePnlUsd" REAL NOT NULL,
    "totalStrategyValueUsd" REAL NOT NULL,
    "totalStrategyPnlUsd" REAL NOT NULL,
    "totalStrategyPnlPct" REAL NOT NULL,
    "hedgeQualityScore" REAL,
    "liquidationBufferPct" REAL,
    "hedgeRebalanceSuggestion" TEXT,
    "crossPositionRebalanceSuggestion" TEXT,
    "rebalanceReason" TEXT NOT NULL DEFAULT 'NONE',
    CONSTRAINT "Snapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Strategy_token1_token2_idx" ON "Strategy"("token1", "token2");

-- CreateIndex
CREATE INDEX "Snapshot_strategyId_timestamp_idx" ON "Snapshot"("strategyId", "timestamp");

-- CreateIndex
CREATE INDEX "Snapshot_timestamp_idx" ON "Snapshot"("timestamp");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Snapshot" (
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
    "hedge1FundingPaidUsd" REAL NOT NULL DEFAULT 0,
    "hedge2PositionSize" REAL NOT NULL,
    "hedge2EntryPrice" REAL NOT NULL,
    "hedge2Leverage" REAL NOT NULL,
    "hedge2MarginUsd" REAL NOT NULL,
    "hedge2PnlUsd" REAL NOT NULL,
    "hedge2LiquidationPrice" REAL,
    "hedge2FundingPaidUsd" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Snapshot" ("accountEquityUsd", "crossPositionRebalanceSuggestion", "fundingPaidUsd", "hedge1EntryPrice", "hedge1Leverage", "hedge1LiquidationPrice", "hedge1MarginUsd", "hedge1PnlUsd", "hedge1PositionSize", "hedge2EntryPrice", "hedge2Leverage", "hedge2LiquidationPrice", "hedge2MarginUsd", "hedge2PnlUsd", "hedge2PositionSize", "hedgeQualityScore", "hedgeRebalanceSuggestion", "id", "liquidationBufferPct", "lpFeesUsd", "lpPnlUsd", "lpPrice", "lpToken1Amount", "lpToken1FeesEarned", "lpToken2Amount", "lpToken2FeesEarned", "lpValueUsd", "marginUsedUsd", "rebalanceReason", "strategyId", "timestamp", "token1Price", "token2Price", "totalHedgePnlUsd", "totalStrategyPnlPct", "totalStrategyPnlUsd", "totalStrategyValueUsd") SELECT "accountEquityUsd", "crossPositionRebalanceSuggestion", "fundingPaidUsd", "hedge1EntryPrice", "hedge1Leverage", "hedge1LiquidationPrice", "hedge1MarginUsd", "hedge1PnlUsd", "hedge1PositionSize", "hedge2EntryPrice", "hedge2Leverage", "hedge2LiquidationPrice", "hedge2MarginUsd", "hedge2PnlUsd", "hedge2PositionSize", "hedgeQualityScore", "hedgeRebalanceSuggestion", "id", "liquidationBufferPct", "lpFeesUsd", "lpPnlUsd", "lpPrice", "lpToken1Amount", "lpToken1FeesEarned", "lpToken2Amount", "lpToken2FeesEarned", "lpValueUsd", "marginUsedUsd", "rebalanceReason", "strategyId", "timestamp", "token1Price", "token2Price", "totalHedgePnlUsd", "totalStrategyPnlPct", "totalStrategyPnlUsd", "totalStrategyValueUsd" FROM "Snapshot";
DROP TABLE "Snapshot";
ALTER TABLE "new_Snapshot" RENAME TO "Snapshot";
CREATE INDEX "Snapshot_strategyId_timestamp_idx" ON "Snapshot"("strategyId", "timestamp");
CREATE INDEX "Snapshot_timestamp_idx" ON "Snapshot"("timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

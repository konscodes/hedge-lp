// Client-side snapshot calculations
// This replaces the server-side calculation logic for client-side storage

import {
  computeLPState,
  computeLiquidityFromNotional,
  calculateTargetHedgePositions,
  calculateAdjustment,
  calculateHedgeQualityScore,
  calculateLiquidationBuffer,
  calculateCrossPositionRebalance,
  checkPriceMoveTrigger,
  checkDeltaDriftTrigger,
  calculateLPValueUsd,
  calculateHedgePnl,
} from './hedgeMath'
import * as storage from './storage'

export type RebalanceReason = 'NONE' | 'PRICE_MOVE' | 'DELTA_DRIFT' | 'BOTH' | 'MANUAL' | 'CROSS_POSITION'

export interface SnapshotCalculationResult {
  lpValueUsd: number
  lpPnlUsd: number
  hedge1PnlUsd: number
  hedge2PnlUsd: number
  totalHedgePnlUsd: number
  marginUsedUsd: number
  fundingPaidUsd: number
  lpFeesUsd: number
  totalStrategyValueUsd: number
  totalStrategyPnlUsd: number
  totalStrategyPnlPct: number
  hedgeQualityScore: number | null
  liquidationBufferPct: number | null
  hedgeRebalanceSuggestion: string | null
  crossPositionRebalanceSuggestion: string | null
  rebalanceReason: RebalanceReason
}

export function calculateSnapshot(
  strategy: storage.Strategy,
  snapshotData: {
    token1Price: number
    token2Price: number
    lpPrice?: number
    lpToken1Amount: number
    lpToken2Amount: number
    lpToken1FeesEarned: number
    lpToken2FeesEarned: number
    hedge1PositionSize: number
    hedge1EntryPrice: number
    hedge1Leverage: number
    hedge1MarginUsd: number
    hedge1FundingPaidUsd: number
    hedge1LiquidationPrice: number | null
    hedge2PositionSize: number
    hedge2EntryPrice: number
    hedge2Leverage: number
    hedge2MarginUsd: number
    hedge2FundingPaidUsd: number
    hedge2LiquidationPrice: number | null
    accountEquityUsd: number
  },
  lastSnapshot: storage.Snapshot | null
): SnapshotCalculationResult {
  // Calculate LP value from token amounts and prices
  const lpValueUsd = calculateLPValueUsd(
    snapshotData.lpToken1Amount,
    snapshotData.lpToken2Amount,
    snapshotData.token1Price,
    snapshotData.token2Price
  )

  // Calculate LP P&L (vs last snapshot or vs starting capital if first snapshot)
  const lpPnlUsd = lastSnapshot
    ? lpValueUsd - lastSnapshot.lpValueUsd
    : lpValueUsd - (strategy.startingCapitalUsd * 0.5) // Assume 50% initial LP allocation

  // Calculate hedge P&L for each position
  const hedge1PnlUsd = calculateHedgePnl(
    snapshotData.hedge1PositionSize,
    snapshotData.hedge1EntryPrice,
    snapshotData.token1Price
  )

  const hedge2PnlUsd = calculateHedgePnl(
    snapshotData.hedge2PositionSize,
    snapshotData.hedge2EntryPrice,
    snapshotData.token2Price
  )

  const totalHedgePnlUsd = hedge1PnlUsd + hedge2PnlUsd

  // Auto-calculate total margin used
  const marginUsedUsd = snapshotData.hedge1MarginUsd + snapshotData.hedge2MarginUsd

  // Auto-calculate total funding paid
  const fundingPaidUsd = snapshotData.hedge1FundingPaidUsd + snapshotData.hedge2FundingPaidUsd

  // Calculate LP fees in USD
  const lpFeesUsd = (snapshotData.lpToken1FeesEarned * snapshotData.token1Price) +
    (snapshotData.lpToken2FeesEarned * snapshotData.token2Price)

  // Calculate total strategy value and P&L
  const totalStrategyValueUsd = lpValueUsd + snapshotData.accountEquityUsd
  const totalStrategyPnlUsd = lpPnlUsd + totalHedgePnlUsd - fundingPaidUsd
  const totalStrategyPnlPct = (totalStrategyPnlUsd / strategy.startingCapitalUsd) * 100

  // Calculate hedge quality score
  const hedgeQualityScore = calculateHedgeQualityScore(
    lpPnlUsd,
    hedge1PnlUsd,
    hedge2PnlUsd,
    fundingPaidUsd
  )

  // Calculate liquidation buffer (minimum across both positions)
  const liquidationBufferPct = calculateLiquidationBuffer(
    snapshotData.token1Price,
    snapshotData.token2Price,
    snapshotData.hedge1LiquidationPrice,
    snapshotData.hedge2LiquidationPrice,
    snapshotData.hedge1PositionSize,
    snapshotData.hedge2PositionSize
  )

  // Calculate target hedge positions based on LP state
  const lpPrice = snapshotData.lpPrice || (snapshotData.token1Price / snapshotData.token2Price)

  // Clamp LP price to range for liquidity calculation
  const referencePrice = Math.max(strategy.pa, Math.min(strategy.pb, lpPrice))
  const midPrice = (strategy.pa + strategy.pb) / 2
  const priceForLiquidity = referencePrice === lpPrice ? lpPrice : midPrice

  let estimatedL: number
  try {
    estimatedL = computeLiquidityFromNotional(
      lpValueUsd,
      priceForLiquidity,
      strategy.pa,
      strategy.pb
    )
  } catch (error) {
    // Fallback estimation
    const sqrtPa = Math.sqrt(strategy.pa)
    const sqrtPb = Math.sqrt(strategy.pb)
    const sqrtP = Math.sqrt(Math.max(strategy.pa, Math.min(strategy.pb, lpPrice)))
    const rangeFactor = (1 / sqrtPa - 1 / sqrtPb) * midPrice + (sqrtP - sqrtPa)
    estimatedL = lpValueUsd / Math.max(rangeFactor, 0.001)
  }

  const lpState = computeLPState(
    lpPrice,
    estimatedL,
    strategy.pa,
    strategy.pb
  )

  const targetHedges = calculateTargetHedgePositions(lpState)

  // Calculate adjustments for each hedge
  const adjustment1 = calculateAdjustment(
    targetHedges.targetHedge1,
    snapshotData.hedge1PositionSize
  )

  const adjustment2 = calculateAdjustment(
    targetHedges.targetHedge2,
    snapshotData.hedge2PositionSize
  )

  // Determine rebalance reason
  let rebalanceReason: RebalanceReason = 'NONE'

  if (lastSnapshot) {
    const priceMove1 = checkPriceMoveTrigger(
      snapshotData.token1Price,
      lastSnapshot.token1Price,
      strategy.priceMoveThresholdPct
    )
    const priceMove2 = checkPriceMoveTrigger(
      snapshotData.token2Price,
      lastSnapshot.token2Price,
      strategy.priceMoveThresholdPct
    )

    const deltaDrift1 = checkDeltaDriftTrigger(
      adjustment1,
      targetHedges.targetHedge1,
      strategy.deltaDriftThresholdPct
    )
    const deltaDrift2 = checkDeltaDriftTrigger(
      adjustment2,
      targetHedges.targetHedge2,
      strategy.deltaDriftThresholdPct
    )

    if (priceMove1 || priceMove2 || deltaDrift1 || deltaDrift2) {
      if ((priceMove1 || priceMove2) && (deltaDrift1 || deltaDrift2)) {
        rebalanceReason = 'BOTH'
      } else if (priceMove1 || priceMove2) {
        rebalanceReason = 'PRICE_MOVE'
      } else {
        rebalanceReason = 'DELTA_DRIFT'
      }
    }
  }

  // Calculate cross-position rebalancing suggestion
  const crossPositionRebalance = calculateCrossPositionRebalance(
    lpValueUsd,
    snapshotData.accountEquityUsd,
    strategy.startingCapitalUsd,
    liquidationBufferPct,
    strategy.crossPositionRebalanceThresholdPct
  )

  if (crossPositionRebalance.shouldRebalance) {
    rebalanceReason = 'CROSS_POSITION'
  }

  // Build hedge rebalance suggestion JSON
  const hedgeRebalanceSuggestion = JSON.stringify({
    token1: {
      current: snapshotData.hedge1PositionSize,
      target: targetHedges.targetHedge1,
      adjustment: adjustment1,
      reason: Math.abs(adjustment1) > 0.001 ? 'Delta drift' : 'None'
    },
    token2: {
      current: snapshotData.hedge2PositionSize,
      target: targetHedges.targetHedge2,
      adjustment: adjustment2,
      reason: Math.abs(adjustment2) > 0.001 ? 'Delta drift' : 'None'
    }
  })

  const crossPositionRebalanceSuggestionJson = crossPositionRebalance.shouldRebalance
    ? JSON.stringify(crossPositionRebalance)
    : null

  return {
    lpValueUsd,
    lpPnlUsd,
    hedge1PnlUsd,
    hedge2PnlUsd,
    totalHedgePnlUsd,
    marginUsedUsd,
    fundingPaidUsd,
    lpFeesUsd,
    totalStrategyValueUsd,
    totalStrategyPnlUsd,
    totalStrategyPnlPct,
    hedgeQualityScore,
    liquidationBufferPct,
    hedgeRebalanceSuggestion,
    crossPositionRebalanceSuggestion: crossPositionRebalanceSuggestionJson,
    rebalanceReason,
  }
}


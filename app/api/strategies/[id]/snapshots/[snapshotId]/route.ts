import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
} from '@/lib/hedgeMath'
import { RebalanceReason } from '@/lib/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params
    const snapshot = await prisma.snapshot.findFirst({
      where: {
        id: snapshotId,
        strategyId: id,
      },
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Error fetching snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'token1Price', 'token2Price', 'lpToken1Amount', 'lpToken2Amount',
      'hedge1PositionSize', 'hedge1EntryPrice', 'hedge1Leverage', 'hedge1MarginUsd',
      'hedge2PositionSize', 'hedge2EntryPrice', 'hedge2Leverage', 'hedge2MarginUsd',
      'accountEquityUsd'
    ]

    const missingFields = requiredFields.filter(field =>
      body[field] === undefined || body[field] === null || body[field] === ''
    )

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: `Missing: ${missingFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id }
    })

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Get the snapshot being edited
    const existingSnapshot = await prisma.snapshot.findFirst({
      where: {
        id: snapshotId,
        strategyId: id,
      },
    })

    if (!existingSnapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      )
    }

    // Get previous snapshot for P&L calculations (snapshot before the one being edited)
    const previousSnapshot = await prisma.snapshot.findFirst({
      where: {
        strategyId: id,
        timestamp: {
          lt: existingSnapshot.timestamp,
        },
      },
      orderBy: { timestamp: 'desc' }
    })

    // Calculate LP value from token amounts and prices
    const lpValueUsd = calculateLPValueUsd(
      body.lpToken1Amount,
      body.lpToken2Amount,
      body.token1Price,
      body.token2Price
    )

    // Calculate LP P&L (vs previous snapshot or vs starting capital if first snapshot)
    const lpPnlUsd = previousSnapshot
      ? lpValueUsd - previousSnapshot.lpValueUsd
      : lpValueUsd - (strategy.startingCapitalUsd * 0.5) // Assume 50% initial LP allocation

    // Calculate hedge P&L for each position
    const hedge1PnlUsd = calculateHedgePnl(
      body.hedge1PositionSize,
      body.hedge1EntryPrice,
      body.token1Price
    )

    const hedge2PnlUsd = calculateHedgePnl(
      body.hedge2PositionSize,
      body.hedge2EntryPrice,
      body.token2Price
    )

    const totalHedgePnlUsd = hedge1PnlUsd + hedge2PnlUsd

    // Auto-calculate total margin used
    const marginUsedUsd = body.hedge1MarginUsd + body.hedge2MarginUsd

    // Auto-calculate total funding paid
    const fundingPaidUsd = (body.hedge1FundingPaidUsd || 0) + (body.hedge2FundingPaidUsd || 0)

    // Calculate LP fees in USD
    const lpFeesUsd = (body.lpToken1FeesEarned * body.token1Price) +
      (body.lpToken2FeesEarned * body.token2Price)

    // Calculate total strategy value and P&L
    const totalStrategyValueUsd = lpValueUsd + body.accountEquityUsd
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
      body.token1Price,
      body.token2Price,
      body.hedge1LiquidationPrice,
      body.hedge2LiquidationPrice,
      body.hedge1PositionSize,
      body.hedge2PositionSize
    )

    // Calculate target hedge positions based on LP state
    const lpPrice = body.lpPrice || (body.token1Price / body.token2Price)

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
      // Fallback: use a simple estimation if calculation fails
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
      body.hedge1PositionSize
    )

    const adjustment2 = calculateAdjustment(
      targetHedges.targetHedge2,
      body.hedge2PositionSize
    )

    // Determine rebalance reason
    let rebalanceReason: RebalanceReason = RebalanceReason.NONE

    if (previousSnapshot) {
      const priceMove1 = checkPriceMoveTrigger(
        body.token1Price,
        previousSnapshot.token1Price,
        strategy.priceMoveThresholdPct
      )
      const priceMove2 = checkPriceMoveTrigger(
        body.token2Price,
        previousSnapshot.token2Price,
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
          rebalanceReason = RebalanceReason.BOTH
        } else if (priceMove1 || priceMove2) {
          rebalanceReason = RebalanceReason.PRICE_MOVE
        } else {
          rebalanceReason = RebalanceReason.DELTA_DRIFT
        }
      }
    }

    // Calculate cross-position rebalancing suggestion
    const crossPositionRebalance = calculateCrossPositionRebalance(
      lpValueUsd,
      body.accountEquityUsd,
      strategy.startingCapitalUsd,
      liquidationBufferPct,
      strategy.crossPositionRebalanceThresholdPct
    )

    if (crossPositionRebalance.shouldRebalance) {
      rebalanceReason = RebalanceReason.CROSS_POSITION
    }

    // Build hedge rebalance suggestion JSON
    const hedgeRebalanceSuggestion = JSON.stringify({
      token1: {
        current: body.hedge1PositionSize,
        target: targetHedges.targetHedge1,
        adjustment: adjustment1,
        reason: Math.abs(adjustment1) > 0.001 ? 'Delta drift' : 'None'
      },
      token2: {
        current: body.hedge2PositionSize,
        target: targetHedges.targetHedge2,
        adjustment: adjustment2,
        reason: Math.abs(adjustment2) > 0.001 ? 'Delta drift' : 'None'
      }
    })

    const crossPositionRebalanceSuggestionJson = crossPositionRebalance.shouldRebalance
      ? JSON.stringify(crossPositionRebalance)
      : null

    // Update snapshot
    const snapshot = await prisma.snapshot.update({
      where: { id: snapshotId },
      data: {
        token1Price: body.token1Price,
        token2Price: body.token2Price,
        lpPrice: body.lpPrice || lpPrice,
        lpToken1Amount: body.lpToken1Amount,
        lpToken2Amount: body.lpToken2Amount,
        lpValueUsd,
        lpToken1FeesEarned: body.lpToken1FeesEarned || 0,
        lpToken2FeesEarned: body.lpToken2FeesEarned || 0,
        lpFeesUsd,
        lpPnlUsd,
        hedge1PositionSize: body.hedge1PositionSize,
        hedge1EntryPrice: body.hedge1EntryPrice,
        hedge1Leverage: body.hedge1Leverage,
        hedge1MarginUsd: body.hedge1MarginUsd,
        hedge1FundingPaidUsd: body.hedge1FundingPaidUsd || 0,
        hedge1PnlUsd,
        hedge1LiquidationPrice: body.hedge1LiquidationPrice,
        hedge2PositionSize: body.hedge2PositionSize,
        hedge2EntryPrice: body.hedge2EntryPrice,
        hedge2Leverage: body.hedge2Leverage,
        hedge2MarginUsd: body.hedge2MarginUsd,
        hedge2FundingPaidUsd: body.hedge2FundingPaidUsd || 0,
        hedge2PnlUsd,
        hedge2LiquidationPrice: body.hedge2LiquidationPrice,
        accountEquityUsd: body.accountEquityUsd,
        marginUsedUsd, // Auto-calculated
        fundingPaidUsd, // Auto-calculated
        totalHedgePnlUsd,
        totalStrategyValueUsd,
        totalStrategyPnlUsd,
        totalStrategyPnlPct,
        hedgeQualityScore,
        liquidationBufferPct,
        hedgeRebalanceSuggestion,
        crossPositionRebalanceSuggestion: crossPositionRebalanceSuggestionJson,
        rebalanceReason,
      }
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Error updating snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to update snapshot', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


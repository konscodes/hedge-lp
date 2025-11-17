"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SnapshotForm } from "./SnapshotForm"
import {
  computeLPState,
  computeLiquidityFromNotional,
  calculateTargetHedgePositions,
  calculateAdjustment,
  formatPositionSize,
  calculateHedgeQualityScore,
  calculateLiquidationBuffer,
} from "@/lib/hedgeMath"

interface StrategyOverviewProps {
  strategy: any
  onUpdate: () => void
}

export function StrategyOverview({ strategy, onUpdate }: StrategyOverviewProps) {
  const [lastSnapshot, setLastSnapshot] = useState<any>(null)
  const [currentMetrics, setCurrentMetrics] = useState<any>(null)

  useEffect(() => {
    if (strategy?.snapshots && strategy.snapshots.length > 0) {
      setLastSnapshot(strategy.snapshots[0])
      calculateCurrentMetrics(strategy.snapshots[0])
    }
  }, [strategy])

  const calculateCurrentMetrics = (snapshot: any) => {
    if (!snapshot) return

    // Calculate liquidity L from LP value and current price
    const lpPrice = snapshot.lpPrice || (snapshot.token1Price / snapshot.token2Price)
    const estimatedL = computeLiquidityFromNotional(
      snapshot.lpValueUsd,
      lpPrice,
      strategy.pa,
      strategy.pb
    )

    const lpState = computeLPState(
      lpPrice,
      estimatedL,
      strategy.pa,
      strategy.pb
    )

    const targetHedges = calculateTargetHedgePositions(lpState)

    const adjustment1 = calculateAdjustment(
      targetHedges.targetHedge1,
      snapshot.hedge1PositionSize
    )

    const adjustment2 = calculateAdjustment(
      targetHedges.targetHedge2,
      snapshot.hedge2PositionSize
    )

    const hedgeQualityScore = calculateHedgeQualityScore(
      snapshot.lpPnlUsd,
      snapshot.hedge1PnlUsd,
      snapshot.hedge2PnlUsd,
      snapshot.fundingPaidUsd || 0
    )

    const liquidationBufferPct = calculateLiquidationBuffer(
      snapshot.token1Price,
      snapshot.token2Price,
      snapshot.hedge1LiquidationPrice,
      snapshot.hedge2LiquidationPrice,
      snapshot.hedge1PositionSize,
      snapshot.hedge2PositionSize
    )

    // Parse rebalance suggestions
    let hedgeRebalanceSuggestion = null
    let crossPositionRebalanceSuggestion = null
    
    try {
      if (snapshot.hedgeRebalanceSuggestion) {
        hedgeRebalanceSuggestion = JSON.parse(snapshot.hedgeRebalanceSuggestion)
      }
      if (snapshot.crossPositionRebalanceSuggestion) {
        crossPositionRebalanceSuggestion = JSON.parse(snapshot.crossPositionRebalanceSuggestion)
      }
    } catch (e) {
      console.error("Error parsing rebalance suggestions:", e)
    }

    setCurrentMetrics({
      lpState,
      targetHedges,
      adjustment1,
      adjustment2,
      hedgeQualityScore,
      liquidationBufferPct,
      hedgeRebalanceSuggestion,
      crossPositionRebalanceSuggestion,
    })
  }


  const getQualityBadge = (score: number | null) => {
    if (score === null) return null
    if (score >= 0.8) {
      return <Badge className="bg-green-500">Excellent</Badge>
    } else if (score >= 0.6) {
      return <Badge className="bg-blue-500">Good</Badge>
    } else if (score >= 0.4) {
      return <Badge className="bg-yellow-500">Fair</Badge>
    } else {
      return <Badge className="bg-red-500">Poor</Badge>
    }
  }

  const getLiquidationBufferColor = (buffer: number | null) => {
    if (buffer === null) return "text-muted-foreground"
    if (buffer > 30) return "text-green-600"
    if (buffer > 20) return "text-yellow-600"
    return "text-red-600"
  }

  // Calculate capital allocation
  const capitalAllocation = lastSnapshot ? {
    lpPct: (lastSnapshot.lpValueUsd / lastSnapshot.totalStrategyValueUsd) * 100,
    hedgePct: (lastSnapshot.accountEquityUsd / lastSnapshot.totalStrategyValueUsd) * 100,
  } : null

  if (!lastSnapshot) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>No Snapshots Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Log your initial snapshot to start tracking your strategy. This should be done right after opening both LP and hedge positions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {lastSnapshot && (
        <>
          {/* Summary Cards - 2x2 Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* LP Position Card */}
            <Card>
              <CardHeader>
                <CardTitle>LP Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">
                  ${lastSnapshot.lpValueUsd.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Starting Capital: ${strategy.startingCapitalUsd.toFixed(2)}
                </div>
                <div className={`text-sm font-medium ${lastSnapshot.lpPnlUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P&L: ${lastSnapshot.lpPnlUsd.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lastSnapshot.lpToken1Amount.toFixed(3)} {strategy.token1} + {lastSnapshot.lpToken2Amount.toFixed(3)} {strategy.token2}
                </div>
                <div className="text-xs text-muted-foreground">
                  Fees: ${lastSnapshot.lpFeesUsd.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Combined Strategy Card */}
            <Card>
              <CardHeader>
                <CardTitle>Combined Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">
                  ${lastSnapshot.totalStrategyValueUsd.toFixed(2)}
                </div>
                <div className={`text-sm font-medium ${lastSnapshot.totalStrategyPnlUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Total P&L: ${lastSnapshot.totalStrategyPnlUsd.toFixed(2)} ({lastSnapshot.totalStrategyPnlPct.toFixed(2)}%)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Hedge Quality:</span>
                  {getQualityBadge(currentMetrics?.hedgeQualityScore)}
                </div>
                {capitalAllocation && (
                  <div className="text-xs text-muted-foreground">
                    Allocation: {capitalAllocation.lpPct.toFixed(1)}% LP, {capitalAllocation.hedgePct.toFixed(1)}% Hedge
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hedge Position Card - Token1 */}
            <Card>
              <CardHeader>
                <CardTitle>Hedge Position - {strategy.token1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-medium">
                  {formatPositionSize(lastSnapshot.hedge1PositionSize, strategy.token1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Entry: ${lastSnapshot.hedge1EntryPrice.toFixed(2)} • {lastSnapshot.hedge1Leverage}x
                </div>
                <div className={`text-sm font-medium ${lastSnapshot.hedge1PnlUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P&L: ${lastSnapshot.hedge1PnlUsd.toFixed(2)}
                </div>
                {lastSnapshot.hedge1LiquidationPrice && (
                  <div className={`text-xs ${getLiquidationBufferColor(
                    currentMetrics?.liquidationBufferPct || null
                  )}`}>
                    Liq Price: ${lastSnapshot.hedge1LiquidationPrice.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hedge Position Card - Token2 */}
            <Card>
              <CardHeader>
                <CardTitle>Hedge Position - {strategy.token2}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-medium">
                  {formatPositionSize(lastSnapshot.hedge2PositionSize, strategy.token2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Entry: ${lastSnapshot.hedge2EntryPrice.toFixed(2)} • {lastSnapshot.hedge2Leverage}x
                </div>
                <div className={`text-sm font-medium ${lastSnapshot.hedge2PnlUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P&L: ${lastSnapshot.hedge2PnlUsd.toFixed(2)}
                </div>
                {lastSnapshot.hedge2LiquidationPrice && (
                  <div className={`text-xs ${getLiquidationBufferColor(
                    currentMetrics?.liquidationBufferPct || null
                  )}`}>
                    Liq Price: ${lastSnapshot.hedge2LiquidationPrice.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Liquidation Buffer and Price Range - Side by Side */}
          <div className="grid gap-4 md:grid-cols-2">
            {currentMetrics?.liquidationBufferPct !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Liquidation Buffer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getLiquidationBufferColor(currentMetrics.liquidationBufferPct)}`}>
                    {currentMetrics.liquidationBufferPct.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Minimum buffer across both hedge positions
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Range Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Price Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Price Range Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-lg font-semibold">{strategy.pa.toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const midPrice = (strategy.pa + strategy.pb) / 2
                            const pctChange = ((strategy.pa - midPrice) / midPrice) * 100
                            return `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`
                          })()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{lastSnapshot.lpPrice.toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">Current</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{strategy.pb.toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const midPrice = (strategy.pa + strategy.pb) / 2
                            const pctChange = ((strategy.pb - midPrice) / midPrice) * 100
                            return `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full">
                      {/* Range fill */}
                      <div 
                        className="absolute h-full bg-primary/30 rounded-full"
                        style={{
                          left: '0%',
                          width: '100%',
                        }}
                      />
                      {/* Current price indicator */}
                      <div 
                        className="absolute h-full w-0.5 bg-primary rounded-full"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((lastSnapshot.lpPrice - strategy.pa) / (strategy.pb - strategy.pa)) * 100))}%`,
                        }}
                      />
                      {/* Handle */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-primary rounded-full"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((lastSnapshot.lpPrice - strategy.pa) / (strategy.pb - strategy.pa)) * 100))}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rebalance Suggestions */}
          {currentMetrics?.hedgeRebalanceSuggestion && (
            <Card>
              <CardHeader>
                <CardTitle>Hedge Rebalancing Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Token1 Rebalance */}
                  {Math.abs(currentMetrics.adjustment1) > 0.001 && (
                    <div className="border rounded-lg p-4">
                      <div className="text-sm font-medium mb-2">{strategy.token1}</div>
                      <div className="text-xs text-muted-foreground mb-1">Current: {formatPositionSize(lastSnapshot.hedge1PositionSize, strategy.token1)}</div>
                      <div className="text-xs text-muted-foreground mb-1">Target: {formatPositionSize(currentMetrics.targetHedges.targetHedge1, strategy.token1)}</div>
                      <div className={`text-sm font-bold mt-2 ${currentMetrics.adjustment1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentMetrics.adjustment1 >= 0 ? 'Buy' : 'Sell'} {Math.abs(currentMetrics.adjustment1).toFixed(3)} {strategy.token1}
                      </div>
                    </div>
                  )}

                  {/* Token2 Rebalance */}
                  {Math.abs(currentMetrics.adjustment2) > 0.001 && (
                    <div className="border rounded-lg p-4">
                      <div className="text-sm font-medium mb-2">{strategy.token2}</div>
                      <div className="text-xs text-muted-foreground mb-1">Current: {formatPositionSize(lastSnapshot.hedge2PositionSize, strategy.token2)}</div>
                      <div className="text-xs text-muted-foreground mb-1">Target: {formatPositionSize(currentMetrics.targetHedges.targetHedge2, strategy.token2)}</div>
                      <div className={`text-sm font-bold mt-2 ${currentMetrics.adjustment2 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {currentMetrics.adjustment2 >= 0 ? 'Buy' : 'Sell'} {Math.abs(currentMetrics.adjustment2).toFixed(3)} {strategy.token2}
                      </div>
                    </div>
                  )}
                </div>
                {lastSnapshot.rebalanceReason !== 'NONE' && (
                  <div className="mt-2">
                    <Badge variant="outline">
                      Trigger: {lastSnapshot.rebalanceReason.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cross-Position Rebalancing */}
          {currentMetrics?.crossPositionRebalanceSuggestion?.shouldRebalance && (
            <Alert>
              <AlertTitle>Cross-Position Rebalancing Suggested</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">{currentMetrics.crossPositionRebalanceSuggestion.reason}</p>
                <div className="grid gap-2 md:grid-cols-2 mt-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Allocation</div>
                    <div className="text-lg font-medium">
                      {capitalAllocation?.lpPct.toFixed(1)}% LP, {capitalAllocation?.hedgePct.toFixed(1)}% Hedge
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Suggested Allocation</div>
                    <div className="text-lg font-medium">
                      {currentMetrics.crossPositionRebalanceSuggestion.suggestedLpAllocationPct.toFixed(1)}% LP, {currentMetrics.crossPositionRebalanceSuggestion.suggestedHedgeAllocationPct.toFixed(1)}% Hedge
                    </div>
                  </div>
                </div>
                {currentMetrics.crossPositionRebalanceSuggestion.capitalToMove !== 0 && (
                  <div className="mt-2 text-sm font-medium">
                    Action: Move ${Math.abs(currentMetrics.crossPositionRebalanceSuggestion.capitalToMove).toFixed(2)} {currentMetrics.crossPositionRebalanceSuggestion.capitalToMove > 0 ? 'from LP to Hedge' : 'from Hedge to LP'}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

        </>
      )}
    </div>
  )
}

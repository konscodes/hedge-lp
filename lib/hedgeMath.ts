/**
 * CLP (Concentrated Liquidity Pool) Math Functions
 * Ported from Python script for delta hedging calculations
 * Updated for dual-token LP with dual hedge positions
 */

export interface LPState {
  x: number;      // Base token amount (token1)
  y: number;      // Quote token amount (token2)
  v: number;      // Total portfolio value in quote token (USD) at price p
  delta: number;  // Token1 exposure (inside range equals x)
}

export interface DualHedgeState {
  hedge1Delta: number;  // Delta from hedge position 1 (token1)
  hedge2Delta: number;  // Delta from hedge position 2 (token2)
  totalDelta: number;   // Combined delta exposure
}

export interface CrossPositionRebalanceSuggestion {
  shouldRebalance: boolean;
  reason: string;
  suggestedLpAllocationPct: number;
  suggestedHedgeAllocationPct: number;
  capitalToMove: number; // Positive = move to hedge, Negative = move to LP
  currentLiquidationBufferPct: number;
}

/**
 * Compute LP state at price p for a CLMM position defined by (L, pa, pb).
 * 
 * @param p - Current price (token1/token2)
 * @param L - Liquidity parameter
 * @param pa - Lower price bound
 * @param pb - Upper price bound
 * @returns LPState with x, y, v, delta
 */
export function computeLPState(
  p: number,
  L: number,
  pa: number,
  pb: number
): LPState {
  if (p <= 0) {
    return { x: 0.0, y: 0.0, v: 0.0, delta: 0.0 };
  }

  const sqrtPa = Math.sqrt(pa);
  const sqrtPb = Math.sqrt(pb);
  const sqrtP = Math.sqrt(p);

  if (p < pa) {
    // All token2
    const yFull = L * (sqrtPb - sqrtPa);
    const v = yFull;
    return { x: 0.0, y: yFull, v, delta: 0.0 };
  } else if (p > pb) {
    // All token1
    const xFull = L * (1 / sqrtPa - 1 / sqrtPb);
    const v = xFull * p;
    return { x: xFull, y: 0.0, v, delta: xFull };
  } else {
    // Inside range
    const x = L * (1 / sqrtP - 1 / sqrtPb);
    const y = L * (sqrtP - sqrtPa);
    const v = x * p + y;
    const delta = x; // inside range, delta equals x (token1 exposure)
    return { x, y, v, delta };
  }
}

/**
 * Compute CLMM liquidity L for a target notional V at reference price p0 in range [pa, pb].
 * 
 * Using Uniswap v3 relations: V = L * [ (1/√p0 - 1/√pb)*p0 + (√p0 - √pa) ]
 * 
 * @param V - Target notional value in quote token (USD)
 * @param p0 - Reference price (token1/token2)
 * @param pa - Lower price bound
 * @param pb - Upper price bound
 * @returns Liquidity parameter L
 */
export function computeLiquidityFromNotional(
  V: number,
  p0: number,
  pa: number,
  pb: number
): number {
  if (p0 <= 0 || pa <= 0 || pb <= 0 || !(pa < pb)) {
    throw new Error(`Invalid inputs for L: p0=${p0}, pa=${pa}, pb=${pb}`);
  }

  const sqrtPa = Math.sqrt(pa);
  const sqrtPb = Math.sqrt(pb);
  const sqrtP0 = Math.sqrt(p0);
  const denom = (1.0 / sqrtP0 - 1.0 / sqrtPb) * p0 + (sqrtP0 - sqrtPa);

  if (denom <= 0) {
    throw new Error(
      `Invalid parameters for L: denom=${denom} (p0=${p0}, pa=${pa}, pb=${pb})`
    );
  }

  return V / denom;
}

/**
 * Calculate LP delta exposure for both tokens.
 * 
 * @param lpState - LP state from computeLPState
 * @returns Object with token1Delta and token2Delta
 */
export function calculateLPDelta(lpState: LPState): { token1Delta: number; token2Delta: number } {
  return {
    token1Delta: lpState.delta, // x amount
    token2Delta: lpState.y      // y amount
  };
}

/**
 * Calculate combined delta from two hedge positions.
 * 
 * @param hedge1PositionSize - Position size for token1 (signed, negative = short)
 * @param hedge2PositionSize - Position size for token2 (signed, negative = short)
 * @returns DualHedgeState with individual and total deltas
 */
export function calculateDualHedgeDelta(
  hedge1PositionSize: number,
  hedge2PositionSize: number
): DualHedgeState {
  return {
    hedge1Delta: hedge1PositionSize, // Already signed
    hedge2Delta: hedge2PositionSize, // Already signed
    totalDelta: hedge1PositionSize + hedge2PositionSize
  };
}

/**
 * Calculate target hedge positions for each token based on LP delta.
 * 
 * For dual-token LP, we need to hedge both token exposures:
 * - Target hedge1 = -lpToken1Delta (short if LP is long token1)
 * - Target hedge2 = -lpToken2Delta (short if LP is long token2)
 * 
 * @param lpState - LP state from computeLPState
 * @returns Object with target hedge positions for each token
 */
export function calculateTargetHedgePositions(
  lpState: LPState
): { targetHedge1: number; targetHedge2: number } {
  return {
    targetHedge1: -lpState.delta, // Short token1 if LP is long token1
    targetHedge2: -lpState.y       // Short token2 if LP is long token2
  };
}

/**
 * Calculate target hedge position based on price and LP state (legacy function, kept for compatibility).
 * 
 * Hedge policy:
 * - If p >= pb → target hedge = 0
 * - If p <= pa → target hedge = -delta_at_pa (constant)
 * - Else (inside range) → target hedge = -delta(p)
 * 
 * @param p - Current price
 * @param L - Liquidity parameter
 * @param pa - Lower price bound
 * @param pb - Upper price bound
 * @returns Target hedge position (signed, negative = short)
 */
export function calculateTargetHedge(
  p: number,
  L: number,
  pa: number,
  pb: number
): number {
  const sqrtPa = Math.sqrt(pa);
  const sqrtPb = Math.sqrt(pb);
  const deltaAtPa = L * (1.0 / sqrtPa - 1.0 / sqrtPb);

  if (p >= pb) {
    return 0.0;
  } else if (p <= pa) {
    return -deltaAtPa;
  } else {
    // Inside range: target = -delta(p)
    const lpState = computeLPState(p, L, pa, pb);
    return -lpState.delta;
  }
}

/**
 * Get hedge policy description string.
 */
export function getHedgePolicyDescription(
  p: number,
  pa: number,
  pb: number
): string {
  if (p >= pb) {
    return ">=pb→0";
  } else if (p <= pa) {
    return "<=pa→-δ(pa)";
  } else {
    return "inside→-δ(p)";
  }
}

/**
 * Calculate hedge adjustment suggestion.
 * 
 * @param targetHedge - Target hedge position
 * @param currentHedge - Current hedge position
 * @returns Adjustment needed (positive = buy, negative = sell)
 */
export function calculateAdjustment(
  targetHedge: number,
  currentHedge: number
): number {
  return targetHedge - currentHedge;
}

/**
 * Check if rebalance is needed based on price move threshold.
 * 
 * @param currentPrice - Current market price
 * @param lastRebalancePrice - Price at last rebalance
 * @param thresholdPct - Price move threshold percentage (e.g., 0.02 for 2%)
 * @returns True if price move exceeds threshold
 */
export function checkPriceMoveTrigger(
  currentPrice: number,
  lastRebalancePrice: number | null,
  thresholdPct: number
): boolean {
  if (!lastRebalancePrice || lastRebalancePrice <= 0) {
    return false;
  }
  const priceMovePct = Math.abs(currentPrice - lastRebalancePrice) / lastRebalancePrice;
  return priceMovePct > thresholdPct;
}

/**
 * Check if rebalance is needed based on delta drift threshold.
 * 
 * @param adjustment - Hedge adjustment needed
 * @param targetHedge - Target hedge position
 * @param thresholdPct - Delta drift threshold percentage (e.g., 0.10 for 10%)
 * @returns True if drift exceeds threshold
 */
export function checkDeltaDriftTrigger(
  adjustment: number,
  targetHedge: number,
  thresholdPct: number
): boolean {
  const driftAbs = Math.abs(adjustment);
  const driftTriggerLevel = Math.abs(targetHedge) * thresholdPct;
  return driftAbs > driftTriggerLevel;
}

/**
 * Calculate hedge quality score for dual hedge positions.
 * 
 * Score definition:
 * - If absLpMoveUsd is small (below epsilon), return 1.0 (neutral to small moves)
 * - Else: score = 1 - min(1, abs(netPnlUsd) / absLpMoveUsd)
 *   - If net PnL ≈ 0 while LP PnL magnitude is large → score near 1 (good hedging)
 *   - If net PnL magnitude ≈ LP PnL magnitude → score near 0 (poor hedging)
 * 
 * @param lpPnlUsd - LP P&L in USD
 * @param hedge1PnlUsd - Hedge1 P&L in USD
 * @param hedge2PnlUsd - Hedge2 P&L in USD
 * @param fundingPaidUsd - Cumulative funding paid
 * @param epsilon - Small threshold for considering LP move negligible (default 1.0)
 * @returns Hedge quality score between 0 and 1
 */
export function calculateHedgeQualityScore(
  lpPnlUsd: number,
  hedge1PnlUsd: number,
  hedge2PnlUsd: number,
  fundingPaidUsd: number = 0,
  epsilon: number = 1.0
): number {
  const totalHedgePnlUsd = hedge1PnlUsd + hedge2PnlUsd;
  const netPnlUsd = lpPnlUsd + totalHedgePnlUsd - fundingPaidUsd;
  const absLpMoveUsd = Math.abs(lpPnlUsd);

  if (absLpMoveUsd < epsilon) {
    return 1.0; // Neutral to small moves
  }

  const ratio = Math.abs(netPnlUsd) / absLpMoveUsd;
  return 1 - Math.min(1, ratio);
}

/**
 * Calculate liquidation buffer percentage for dual hedge positions.
 * 
 * @param token1Price - Current token1 price
 * @param token2Price - Current token2 price
 * @param hedge1LiquidationPrice - Liquidation price for hedge1
 * @param hedge2LiquidationPrice - Liquidation price for hedge2
 * @param hedge1PositionSize - Hedge1 position size (signed)
 * @param hedge2PositionSize - Hedge2 position size (signed)
 * @returns Minimum liquidation buffer as percentage, or null if liquidation prices not set
 */
export function calculateLiquidationBuffer(
  token1Price: number,
  token2Price: number,
  hedge1LiquidationPrice: number | null,
  hedge2LiquidationPrice: number | null,
  hedge1PositionSize: number,
  hedge2PositionSize: number
): number | null {
  const buffers: number[] = [];

  // Calculate buffer for hedge1
  if (hedge1LiquidationPrice && hedge1LiquidationPrice > 0) {
    const isLong1 = hedge1PositionSize > 0;
    if (isLong1) {
      // For long positions, liquidation happens when price drops
      const buffer1 = ((token1Price - hedge1LiquidationPrice) / token1Price) * 100;
      buffers.push(buffer1);
    } else {
      // For short positions, liquidation happens when price rises
      const buffer1 = ((hedge1LiquidationPrice - token1Price) / token1Price) * 100;
      buffers.push(buffer1);
    }
  }

  // Calculate buffer for hedge2
  if (hedge2LiquidationPrice && hedge2LiquidationPrice > 0) {
    const isLong2 = hedge2PositionSize > 0;
    if (isLong2) {
      // For long positions, liquidation happens when price drops
      const buffer2 = ((token2Price - hedge2LiquidationPrice) / token2Price) * 100;
      buffers.push(buffer2);
    } else {
      // For short positions, liquidation happens when price rises
      const buffer2 = ((hedge2LiquidationPrice - token2Price) / token2Price) * 100;
      buffers.push(buffer2);
    }
  }

  if (buffers.length === 0) {
    return null;
  }

  // Return minimum buffer (most at-risk position)
  return Math.min(...buffers);
}

/**
 * Calculate cross-position rebalancing suggestion.
 * 
 * Determines if capital should be moved between LP and hedge positions based on:
 * - Liquidation buffer (primary trigger)
 * - Capital allocation imbalance
 * - Strategy performance
 * 
 * @param lpValueUsd - Current LP value in USD
 * @param accountEquityUsd - Current account equity in USD
 * @param startingCapitalUsd - Starting capital for strategy
 * @param liquidationBufferPct - Current liquidation buffer percentage
 * @param thresholdPct - Threshold for triggering rebalance (e.g., 0.20 for 20%)
 * @returns CrossPositionRebalanceSuggestion
 */
export function calculateCrossPositionRebalance(
  lpValueUsd: number,
  accountEquityUsd: number,
  startingCapitalUsd: number,
  liquidationBufferPct: number | null,
  thresholdPct: number
): CrossPositionRebalanceSuggestion {
  const totalValue = lpValueUsd + accountEquityUsd;
  const currentLpAllocationPct = (lpValueUsd / totalValue) * 100;
  const currentHedgeAllocationPct = (accountEquityUsd / totalValue) * 100;

  // Default suggestion: maintain current allocation
  let shouldRebalance = false;
  let reason = "";
  let suggestedLpAllocationPct = currentLpAllocationPct;
  let suggestedHedgeAllocationPct = currentHedgeAllocationPct;
  let capitalToMove = 0;

  // Primary trigger: Low liquidation buffer
  if (liquidationBufferPct !== null && liquidationBufferPct < thresholdPct * 100) {
    shouldRebalance = true;
    reason = `Liquidation buffer low (${liquidationBufferPct.toFixed(2)}%). Move capital from LP to hedge to increase margin.`;
    
    // Calculate how much to move (aim for 30% buffer)
    const targetBufferPct = thresholdPct * 100 + 10; // Add 10% above threshold
    const currentBuffer = liquidationBufferPct;
    const bufferDeficit = targetBufferPct - currentBuffer;
    
    // Estimate capital needed (simplified calculation)
    // In practice, this would consider margin requirements and leverage
    const estimatedCapitalNeeded = accountEquityUsd * (bufferDeficit / 100);
    capitalToMove = Math.min(estimatedCapitalNeeded, lpValueUsd * 0.3); // Max 30% of LP
    
    suggestedHedgeAllocationPct = ((accountEquityUsd + capitalToMove) / totalValue) * 100;
    suggestedLpAllocationPct = ((lpValueUsd - capitalToMove) / totalValue) * 100;
  }

  return {
    shouldRebalance,
    reason,
    suggestedLpAllocationPct,
    suggestedHedgeAllocationPct,
    capitalToMove,
    currentLiquidationBufferPct: liquidationBufferPct || 0
  };
}

/**
 * Calculate percentage change from entry.
 */
export function calculatePctChange(current: number, entry: number): number {
  if (entry === 0) return 0;
  return ((current - entry) / entry) * 100;
}

/**
 * Format position size with sign indicator.
 * 
 * @param size - Position size (signed)
 * @param token - Token symbol
 * @returns Formatted string like "Short 10 SOL" or "Long 5 ETH"
 */
export function formatPositionSize(size: number, token: string): string {
  if (size === 0) {
    return `0 ${token}`;
  } else if (size < 0) {
    return `Short ${Math.abs(size).toFixed(3)} ${token}`;
  } else {
    return `Long ${size.toFixed(3)} ${token}`;
  }
}

/**
 * Calculate LP value in USD from token amounts and prices.
 */
export function calculateLPValueUsd(
  token1Amount: number,
  token2Amount: number,
  token1Price: number,
  token2Price: number
): number {
  return (token1Amount * token1Price) + (token2Amount * token2Price);
}

/**
 * Calculate hedge P&L for a position.
 */
export function calculateHedgePnl(
  positionSize: number,
  entryPrice: number,
  currentPrice: number
): number {
  return positionSize * (currentPrice - entryPrice);
}

// Client-side storage using localStorage
// This replaces Prisma/database for demo purposes

const STORAGE_KEY_STRATEGIES = 'hedge-lp-strategies'
const STORAGE_KEY_SNAPSHOTS = 'hedge-lp-snapshots'

export interface Strategy {
  id: string
  name: string
  token1: string
  token2: string
  lpProtocol: string
  perpVenue: string
  startingCapitalUsd: number
  openDate: string
  pa: number
  pb: number
  priceMoveThresholdPct: number
  deltaDriftThresholdPct: number
  crossPositionRebalanceThresholdPct: number
  createdAt: string
  updatedAt: string
}

export interface Snapshot {
  id: string
  strategyId: string
  timestamp: string
  token1Price: number
  token2Price: number
  lpPrice: number
  lpToken1Amount: number
  lpToken2Amount: number
  lpValueUsd: number
  lpToken1FeesEarned: number
  lpToken2FeesEarned: number
  lpFeesUsd: number
  lpPnlUsd: number
  hedge1PositionSize: number
  hedge1EntryPrice: number
  hedge1Leverage: number
  hedge1MarginUsd: number
  hedge1PnlUsd: number
  hedge1LiquidationPrice: number | null
  hedge1FundingPaidUsd: number
  hedge2PositionSize: number
  hedge2EntryPrice: number
  hedge2Leverage: number
  hedge2MarginUsd: number
  hedge2PnlUsd: number
  hedge2LiquidationPrice: number | null
  hedge2FundingPaidUsd: number
  accountEquityUsd: number
  marginUsedUsd: number
  fundingPaidUsd: number
  totalHedgePnlUsd: number
  totalStrategyValueUsd: number
  totalStrategyPnlUsd: number
  totalStrategyPnlPct: number
  hedgeQualityScore: number | null
  liquidationBufferPct: number | null
  hedgeRebalanceSuggestion: string | null
  crossPositionRebalanceSuggestion: string | null
  rebalanceReason: string
}

// Strategies
export function getStrategies(): Strategy[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY_STRATEGIES)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading strategies from localStorage:', error)
    return []
  }
}

export function getStrategy(id: string): Strategy | null {
  const strategies = getStrategies()
  return strategies.find(s => s.id === id) || null
}

export function createStrategy(data: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>): Strategy {
  const strategies = getStrategies()
  const strategy: Strategy = {
    ...data,
    id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  strategies.push(strategy)
  try {
    localStorage.setItem(STORAGE_KEY_STRATEGIES, JSON.stringify(strategies))
  } catch (error) {
    console.error('Error saving strategy to localStorage:', error)
    throw error
  }
  return strategy
}

export function updateStrategy(id: string, data: Partial<Strategy>): Strategy | null {
  const strategies = getStrategies()
  const index = strategies.findIndex(s => s.id === id)
  if (index === -1) return null
  strategies[index] = {
    ...strategies[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY_STRATEGIES, JSON.stringify(strategies))
  } catch (error) {
    console.error('Error updating strategy in localStorage:', error)
    throw error
  }
  return strategies[index]
}

export function deleteStrategy(id: string): boolean {
  const strategies = getStrategies()
  const filtered = strategies.filter(s => s.id !== id)
  if (filtered.length === strategies.length) return false
  try {
    localStorage.setItem(STORAGE_KEY_STRATEGIES, JSON.stringify(filtered))
    // Also delete all snapshots for this strategy
    const snapshots = getSnapshots(id)
    snapshots.forEach(s => deleteSnapshot(s.id))
  } catch (error) {
    console.error('Error deleting strategy from localStorage:', error)
    throw error
  }
  return true
}

// Snapshots
export function getSnapshots(strategyId: string): Snapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS)
    const allSnapshots: Snapshot[] = data ? JSON.parse(data) : []
    return allSnapshots.filter(s => s.strategyId === strategyId)
  } catch (error) {
    console.error('Error reading snapshots from localStorage:', error)
    return []
  }
}

export function getSnapshot(id: string): Snapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS)
    const allSnapshots: Snapshot[] = data ? JSON.parse(data) : []
    return allSnapshots.find(s => s.id === id) || null
  } catch (error) {
    console.error('Error reading snapshot from localStorage:', error)
    return null
  }
}

export function createSnapshot(data: Omit<Snapshot, 'id' | 'timestamp'>): Snapshot {
  const snapshots = getAllSnapshots()
  const snapshot: Snapshot = {
    ...data,
    id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  }
  snapshots.push(snapshot)
  try {
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots))
  } catch (error) {
    console.error('Error saving snapshot to localStorage:', error)
    throw error
  }
  return snapshot
}

export function updateSnapshot(id: string, data: Partial<Snapshot>): Snapshot | null {
  const snapshots = getAllSnapshots()
  const index = snapshots.findIndex(s => s.id === id)
  if (index === -1) return null
  snapshots[index] = { ...snapshots[index], ...data }
  try {
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots))
  } catch (error) {
    console.error('Error updating snapshot in localStorage:', error)
    throw error
  }
  return snapshots[index]
}

export function deleteSnapshot(id: string): boolean {
  const snapshots = getAllSnapshots()
  const filtered = snapshots.filter(s => s.id !== id)
  if (filtered.length === snapshots.length) return false
  try {
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting snapshot from localStorage:', error)
    throw error
  }
  return true
}

function getAllSnapshots(): Snapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY_SNAPSHOTS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading all snapshots from localStorage:', error)
    return []
  }
}


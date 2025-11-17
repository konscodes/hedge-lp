"use client"

import { useState, useEffect, useCallback } from 'react'
import * as storage from './storage'
import type { Strategy, Snapshot } from './storage'

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStrategies = useCallback(() => {
    setLoading(true)
    try {
      const data = storage.getStrategies()
      // Add snapshot counts
      const withCounts = data.map(s => ({
        ...s,
        _count: {
          snapshots: storage.getSnapshots(s.id).length
        }
      }))
      setStrategies(withCounts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (error) {
      console.error('Error fetching strategies:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStrategies()
    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = () => {
      fetchStrategies()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchStrategies])

  const createStrategy = useCallback(async (data: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const strategy = storage.createStrategy(data)
    fetchStrategies()
    return strategy
  }, [fetchStrategies])

  const deleteStrategy = useCallback(async (id: string) => {
    storage.deleteStrategy(id)
    fetchStrategies()
  }, [fetchStrategies])

  return { strategies, loading, createStrategy, deleteStrategy, refetch: fetchStrategies }
}

export function useStrategy(id: string) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStrategy = useCallback(() => {
    setLoading(true)
    try {
      const data = storage.getStrategy(id)
      setStrategy(data)
    } catch (error) {
      console.error('Error fetching strategy:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchStrategy()
    // Listen for storage changes
    const handleStorageChange = () => {
      fetchStrategy()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchStrategy])

  const updateStrategy = useCallback(async (data: Partial<Strategy>) => {
    const updated = storage.updateStrategy(id, data)
    if (updated) setStrategy(updated)
    return updated
  }, [id])

  return { strategy, loading, updateStrategy, refetch: fetchStrategy }
}

export function useSnapshots(strategyId: string) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSnapshots = useCallback(() => {
    setLoading(true)
    try {
      const data = storage.getSnapshots(strategyId)
      setSnapshots(data.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ))
    } catch (error) {
      console.error('Error fetching snapshots:', error)
    } finally {
      setLoading(false)
    }
  }, [strategyId])

  useEffect(() => {
    fetchSnapshots()
    // Listen for storage changes
    const handleStorageChange = () => {
      fetchSnapshots()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchSnapshots])

  const createSnapshot = useCallback(async (data: Omit<Snapshot, 'id' | 'timestamp'>) => {
    const snapshot = storage.createSnapshot(data)
    fetchSnapshots()
    return snapshot
  }, [strategyId, fetchSnapshots])

  const updateSnapshot = useCallback(async (id: string, data: Partial<Snapshot>) => {
    const updated = storage.updateSnapshot(id, data)
    if (updated) fetchSnapshots()
    return updated
  }, [fetchSnapshots])

  const deleteSnapshot = useCallback(async (id: string) => {
    storage.deleteSnapshot(id)
    fetchSnapshots()
  }, [fetchSnapshots])

  return { snapshots, loading, createSnapshot, updateSnapshot, deleteSnapshot, refetch: fetchSnapshots }
}


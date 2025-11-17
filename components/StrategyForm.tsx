"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface StrategyFormProps {
  strategy?: any
  onSuccess?: () => void
}

export function StrategyForm({ strategy, onSuccess }: StrategyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // Helper to format currency (remove $ and commas)
  const parseCurrency = (value: string) => value.replace(/[$,]/g, '')
  
  // Helper to format percentage (remove %)
  const parsePercentage = (value: string) => value.replace(/%/g, '')

  const [formData, setFormData] = useState({
    name: strategy?.name || "",
    token1: strategy?.token1 || "BNB",
    token2: strategy?.token2 || "ASTER",
    lpProtocol: strategy?.lpProtocol || "PancakeSwap V3",
    perpVenue: strategy?.perpVenue || "Hyperliquid",
    startingCapitalUsd: strategy?.startingCapitalUsd 
      ? `$${strategy.startingCapitalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "",
    openDate: strategy?.openDate 
      ? new Date(strategy.openDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    pa: strategy?.pa?.toString() || "",
    pb: strategy?.pb?.toString() || "",
    priceMoveThresholdPct: strategy?.priceMoveThresholdPct 
      ? `${(strategy.priceMoveThresholdPct * 100).toFixed(2)}%`
      : "2%",
    deltaDriftThresholdPct: strategy?.deltaDriftThresholdPct 
      ? `${(strategy.deltaDriftThresholdPct * 100).toFixed(2)}%`
      : "10%",
    crossPositionRebalanceThresholdPct: strategy?.crossPositionRebalanceThresholdPct 
      ? `${(strategy.crossPositionRebalanceThresholdPct * 100).toFixed(2)}%`
      : "20%",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        startingCapitalUsd: parseFloat(parseCurrency(formData.startingCapitalUsd)),
        openDate: formData.openDate,
        pa: parseFloat(formData.pa),
        pb: parseFloat(formData.pb),
        priceMoveThresholdPct: parseFloat(parsePercentage(formData.priceMoveThresholdPct)) / 100,
        deltaDriftThresholdPct: parseFloat(parsePercentage(formData.deltaDriftThresholdPct)) / 100,
        crossPositionRebalanceThresholdPct: parseFloat(parsePercentage(formData.crossPositionRebalanceThresholdPct)) / 100,
      }

      const url = strategy
        ? `/api/strategies/${strategy.id}`
        : "/api/strategies"
      const method = strategy ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save strategy")
      }

      const data = await res.json()
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/strategies/${data.id}`)
      }
    } catch (error) {
      console.error("Error saving strategy:", error)
      alert(error instanceof Error ? error.message : "Failed to save strategy")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Basic Info</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token1">Token1</Label>
            <Input
              id="token1"
              value={formData.token1}
              onChange={(e) => setFormData({ ...formData, token1: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token2">Token2</Label>
            <Input
              id="token2"
              value={formData.token2}
              onChange={(e) => setFormData({ ...formData, token2: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lpProtocol">LP Protocol</Label>
            <Input
              id="lpProtocol"
              value={formData.lpProtocol}
              onChange={(e) => setFormData({ ...formData, lpProtocol: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perpVenue">Perp Venue</Label>
            <Input
              id="perpVenue"
              value={formData.perpVenue}
              onChange={(e) => setFormData({ ...formData, perpVenue: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startingCapitalUsd">Starting Capital</Label>
            <Input
              id="startingCapitalUsd"
              type="text"
              value={formData.startingCapitalUsd}
              onChange={(e) => {
                // Allow only numbers, $, commas, and decimal point
                const value = e.target.value.replace(/[^0-9$,.]/g, '')
                setFormData({ ...formData, startingCapitalUsd: value })
              }}
              onBlur={(e) => {
                // Format on blur
                const numValue = parseFloat(parseCurrency(e.target.value))
                if (!isNaN(numValue)) {
                  setFormData({ 
                    ...formData, 
                    startingCapitalUsd: `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  })
                }
              }}
              placeholder="$1,000.00"
              required
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date</Label>
            <Input
              id="openDate"
              type="date"
              value={formData.openDate}
              onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">LP Configuration</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pa">Lower Bound (pa)</Label>
            <Input
              id="pa"
              type="number"
              step="0.01"
              value={formData.pa}
              onChange={(e) => setFormData({ ...formData, pa: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pb">Upper Bound (pb)</Label>
            <Input
              id="pb"
              type="number"
              step="0.01"
              value={formData.pb}
              onChange={(e) => setFormData({ ...formData, pb: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              required
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Rebalance Triggers</h3>
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="priceMoveThresholdPct">Price Move Threshold</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Triggers rebalance when price moves by this percentage since last rebalance. Lower values = more frequent rebalancing.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="priceMoveThresholdPct"
                type="text"
                value={formData.priceMoveThresholdPct}
                onChange={(e) => {
                  // Allow only numbers, %, and decimal point
                  const value = e.target.value.replace(/[^0-9%.]/g, '')
                  setFormData({ ...formData, priceMoveThresholdPct: value })
                }}
                onBlur={(e) => {
                  // Format on blur
                  const numValue = parseFloat(parsePercentage(e.target.value))
                  if (!isNaN(numValue)) {
                    setFormData({ 
                      ...formData, 
                      priceMoveThresholdPct: `${numValue.toFixed(2)}%` 
                    })
                  }
                }}
                placeholder="2%"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="deltaDriftThresholdPct">Delta Drift Threshold</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Triggers rebalance when hedge position drifts from target by this percentage of target size. Lower values = tighter hedge alignment.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="deltaDriftThresholdPct"
                type="text"
                value={formData.deltaDriftThresholdPct}
                onChange={(e) => {
                  // Allow only numbers, %, and decimal point
                  const value = e.target.value.replace(/[^0-9%.]/g, '')
                  setFormData({ ...formData, deltaDriftThresholdPct: value })
                }}
                onBlur={(e) => {
                  // Format on blur
                  const numValue = parseFloat(parsePercentage(e.target.value))
                  if (!isNaN(numValue)) {
                    setFormData({ 
                      ...formData, 
                      deltaDriftThresholdPct: `${numValue.toFixed(2)}%` 
                    })
                  }
                }}
                placeholder="10%"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="crossPositionRebalanceThresholdPct">Cross-Position Rebalance Threshold</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Triggers suggestion to move capital between LP and hedge when liquidation buffer falls below this percentage. Lower values = more conservative.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="crossPositionRebalanceThresholdPct"
                type="text"
                value={formData.crossPositionRebalanceThresholdPct}
                onChange={(e) => {
                  // Allow only numbers, %, and decimal point
                  const value = e.target.value.replace(/[^0-9%.]/g, '')
                  setFormData({ ...formData, crossPositionRebalanceThresholdPct: value })
                }}
                onBlur={(e) => {
                  // Format on blur
                  const numValue = parseFloat(parsePercentage(e.target.value))
                  if (!isNaN(numValue)) {
                    setFormData({ 
                      ...formData, 
                      crossPositionRebalanceThresholdPct: `${numValue.toFixed(2)}%` 
                    })
                  }
                }}
                placeholder="20%"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : strategy ? "Update Strategy" : "Create Strategy"}
        </Button>
      </div>
    </form>
  )
}

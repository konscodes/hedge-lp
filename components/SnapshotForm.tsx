"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { calculateLPValueUsd } from "@/lib/hedgeMath"
import * as storage from "@/lib/storage"
import { calculateSnapshot } from "@/lib/snapshotCalculations"

interface SnapshotFormProps {
  strategy: any
  lastSnapshot?: any
  onSuccess?: () => void
  isInitial?: boolean
  snapshotToEdit?: any // Snapshot being edited
  onCancel?: () => void // For canceling edit mode
}

export function SnapshotForm({ strategy, lastSnapshot, onSuccess, isInitial = false, snapshotToEdit, onCancel }: SnapshotFormProps) {
  const [loading, setLoading] = useState(false)
  // Use snapshotToEdit if editing, otherwise use lastSnapshot
  const snapshotData = snapshotToEdit || lastSnapshot
  const [formData, setFormData] = useState({
    token1Price: snapshotData?.token1Price?.toString() || "",
    token2Price: snapshotData?.token2Price?.toString() || "",
    lpPrice: snapshotData?.lpPrice?.toString() || "",
    lpToken1Amount: snapshotData?.lpToken1Amount?.toString() || "",
    lpToken2Amount: snapshotData?.lpToken2Amount?.toString() || "",
    lpToken1FeesEarned: snapshotData?.lpToken1FeesEarned?.toString() || "0",
    lpToken2FeesEarned: snapshotData?.lpToken2FeesEarned?.toString() || "0",
    hedge1PositionSize: snapshotData?.hedge1PositionSize?.toString() || "",
    hedge1EntryPrice: snapshotData?.hedge1EntryPrice?.toString() || "",
    hedge1Leverage: snapshotData?.hedge1Leverage?.toString() || "1.0",
    hedge1MarginUsd: snapshotData?.hedge1MarginUsd?.toString() || "",
    hedge1FundingPaidUsd: snapshotData?.hedge1FundingPaidUsd?.toString() || "0",
    hedge1LiquidationPrice: snapshotData?.hedge1LiquidationPrice?.toString() || "",
    hedge2PositionSize: snapshotData?.hedge2PositionSize?.toString() || "",
    hedge2EntryPrice: snapshotData?.hedge2EntryPrice?.toString() || "",
    hedge2Leverage: snapshotData?.hedge2Leverage?.toString() || "1.0",
    hedge2MarginUsd: snapshotData?.hedge2MarginUsd?.toString() || "",
    hedge2FundingPaidUsd: snapshotData?.hedge2FundingPaidUsd?.toString() || "0",
    hedge2LiquidationPrice: snapshotData?.hedge2LiquidationPrice?.toString() || "",
    accountEquityUsd: snapshotData?.accountEquityUsd?.toString() || "",
  })

  // Calculate LP value in real-time
  const lpValueUsd = formData.token1Price && formData.token2Price && formData.lpToken1Amount && formData.lpToken2Amount
    ? calculateLPValueUsd(
        parseFloat(formData.lpToken1Amount),
        parseFloat(formData.lpToken2Amount),
        parseFloat(formData.token1Price),
        parseFloat(formData.token2Price)
      )
    : 0

  // Calculate LP price if not provided
  useEffect(() => {
    if (!formData.lpPrice && formData.token1Price && formData.token2Price) {
      const calculatedLpPrice = parseFloat(formData.token1Price) / parseFloat(formData.token2Price)
      setFormData(prev => ({ ...prev, lpPrice: calculatedLpPrice.toFixed(6) }))
    }
  }, [formData.token1Price, formData.token2Price])

  // Calculate fee deltas for subsequent snapshots (only if not editing)
  const fee1Delta = !snapshotToEdit && lastSnapshot && formData.lpToken1FeesEarned && lastSnapshot.lpToken1FeesEarned
    ? parseFloat(formData.lpToken1FeesEarned) - lastSnapshot.lpToken1FeesEarned
    : null

  const fee2Delta = !snapshotToEdit && lastSnapshot && formData.lpToken2FeesEarned && lastSnapshot.lpToken2FeesEarned
    ? parseFloat(formData.lpToken2FeesEarned) - lastSnapshot.lpToken2FeesEarned
    : null

  // Calculate funding deltas for subsequent snapshots (only if not editing)
  const funding1Delta = !snapshotToEdit && lastSnapshot && formData.hedge1FundingPaidUsd && lastSnapshot.hedge1FundingPaidUsd
    ? parseFloat(formData.hedge1FundingPaidUsd) - lastSnapshot.hedge1FundingPaidUsd
    : null

  const funding2Delta = !snapshotToEdit && lastSnapshot && formData.hedge2FundingPaidUsd && lastSnapshot.hedge2FundingPaidUsd
    ? parseFloat(formData.hedge2FundingPaidUsd) - lastSnapshot.hedge2FundingPaidUsd
    : null

  // Auto-calculate totals
  const totalMarginUsed = formData.hedge1MarginUsd && formData.hedge2MarginUsd
    ? parseFloat(formData.hedge1MarginUsd) + parseFloat(formData.hedge2MarginUsd)
    : null

  const totalFundingPaid = formData.hedge1FundingPaidUsd && formData.hedge2FundingPaidUsd
    ? parseFloat(formData.hedge1FundingPaidUsd) + parseFloat(formData.hedge2FundingPaidUsd)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate all required fields are filled
      const requiredFields = [
        'token1Price', 'token2Price', 'lpToken1Amount', 'lpToken2Amount',
        'hedge1PositionSize', 'hedge1EntryPrice', 'hedge1Leverage', 'hedge1MarginUsd',
        'hedge2PositionSize', 'hedge2EntryPrice', 'hedge2Leverage', 'hedge2MarginUsd',
        'accountEquityUsd'
      ]
      
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData] === '')
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`)
        setLoading(false)
        return
      }

      // Calculate LP price if not provided
      const calculatedLpPrice = formData.lpPrice 
        ? parseFloat(formData.lpPrice) 
        : (parseFloat(formData.token1Price) / parseFloat(formData.token2Price))

      const payload = {
        token1Price: parseFloat(formData.token1Price),
        token2Price: parseFloat(formData.token2Price),
        lpPrice: calculatedLpPrice,
        lpToken1Amount: parseFloat(formData.lpToken1Amount),
        lpToken2Amount: parseFloat(formData.lpToken2Amount),
        lpToken1FeesEarned: parseFloat(formData.lpToken1FeesEarned) || 0,
        lpToken2FeesEarned: parseFloat(formData.lpToken2FeesEarned) || 0,
        hedge1PositionSize: parseFloat(formData.hedge1PositionSize),
        hedge1EntryPrice: parseFloat(formData.hedge1EntryPrice),
        hedge1Leverage: parseFloat(formData.hedge1Leverage),
        hedge1MarginUsd: parseFloat(formData.hedge1MarginUsd),
        hedge1FundingPaidUsd: parseFloat(formData.hedge1FundingPaidUsd) || 0,
        hedge1LiquidationPrice: formData.hedge1LiquidationPrice ? parseFloat(formData.hedge1LiquidationPrice) : null,
        hedge2PositionSize: parseFloat(formData.hedge2PositionSize),
        hedge2EntryPrice: parseFloat(formData.hedge2EntryPrice),
        hedge2Leverage: parseFloat(formData.hedge2Leverage),
        hedge2MarginUsd: parseFloat(formData.hedge2MarginUsd),
        hedge2FundingPaidUsd: parseFloat(formData.hedge2FundingPaidUsd) || 0,
        hedge2LiquidationPrice: formData.hedge2LiquidationPrice ? parseFloat(formData.hedge2LiquidationPrice) : null,
        accountEquityUsd: parseFloat(formData.accountEquityUsd),
      }

      // Validate no NaN values
      const nanFields = Object.entries(payload).filter(([key, value]) => 
        typeof value === 'number' && isNaN(value) && value !== null
      )
      
      if (nanFields.length > 0) {
        alert(`Invalid values in fields: ${nanFields.map(([key]) => key).join(', ')}`)
        setLoading(false)
        return
      }

      // Get last snapshot for calculations
      const snapshots = storage.getSnapshots(strategy.id)
      const lastSnapshot = snapshots.length > 0 
        ? snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        : null

      // Calculate all derived fields
      const calculations = calculateSnapshot(strategy, {
        token1Price: payload.token1Price,
        token2Price: payload.token2Price,
        lpPrice: calculatedLpPrice,
        lpToken1Amount: payload.lpToken1Amount,
        lpToken2Amount: payload.lpToken2Amount,
        lpToken1FeesEarned: payload.lpToken1FeesEarned,
        lpToken2FeesEarned: payload.lpToken2FeesEarned,
        hedge1PositionSize: payload.hedge1PositionSize,
        hedge1EntryPrice: payload.hedge1EntryPrice,
        hedge1Leverage: payload.hedge1Leverage,
        hedge1MarginUsd: payload.hedge1MarginUsd,
        hedge1FundingPaidUsd: payload.hedge1FundingPaidUsd,
        hedge1LiquidationPrice: payload.hedge1LiquidationPrice,
        hedge2PositionSize: payload.hedge2PositionSize,
        hedge2EntryPrice: payload.hedge2EntryPrice,
        hedge2Leverage: payload.hedge2Leverage,
        hedge2MarginUsd: payload.hedge2MarginUsd,
        hedge2FundingPaidUsd: payload.hedge2FundingPaidUsd,
        hedge2LiquidationPrice: payload.hedge2LiquidationPrice,
        accountEquityUsd: payload.accountEquityUsd,
      }, snapshotToEdit || lastSnapshot)

      // Create or update snapshot
      if (snapshotToEdit) {
        // Update existing snapshot
        storage.updateSnapshot(snapshotToEdit.id, {
          ...payload,
          ...calculations,
        })
      } else {
        // Create new snapshot
        storage.createSnapshot({
          strategyId: strategy.id,
          ...payload,
          ...calculations,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error("Error saving snapshot:", error)
      alert(error instanceof Error ? error.message : "Failed to save snapshot")
    } finally {
      setLoading(false)
    }
  }

  const formatPositionDirection = (size: string) => {
    const num = parseFloat(size)
    if (isNaN(num)) return ""
    if (num === 0) return <Badge variant="outline">Neutral</Badge>
    if (num < 0) return <Badge variant="destructive">Short</Badge>
    return <Badge variant="default">Long</Badge>
  }

  const formatDelta = (delta: number | null) => {
    if (delta === null) return null
    if (delta === 0) return null
    const sign = delta > 0 ? "+" : ""
    const color = delta > 0 ? "text-green-600" : "text-red-600"
    return <span className={color}>{sign}{delta.toFixed(4)}</span>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Accordion type="multiple" defaultValue={["market", "lp", "hedge1", "hedge2", "account"]}>
        <AccordionItem value="market">
          <AccordionTrigger>Market Prices</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="token1Price">{strategy.token1} Price (USD)</Label>
                <Input
                  id="token1Price"
                  type="number"
                  step="0.01"
                  value={formData.token1Price}
                  onChange={(e) => setFormData({ ...formData, token1Price: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token2Price">{strategy.token2} Price (USD)</Label>
                <Input
                  id="token2Price"
                  type="number"
                  step="0.01"
                  value={formData.token2Price}
                  onChange={(e) => setFormData({ ...formData, token2Price: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lpPrice">LP Price ({strategy.token1}/{strategy.token2})</Label>
                <Input
                  id="lpPrice"
                  type="number"
                  step="0.000001"
                  value={formData.lpPrice}
                  onChange={(e) => setFormData({ ...formData, lpPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lp">
          <AccordionTrigger>LP Position</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lpToken1Amount">{strategy.token1} Amount</Label>
                <Input
                  id="lpToken1Amount"
                  type="number"
                  step="0.000001"
                  value={formData.lpToken1Amount}
                  onChange={(e) => setFormData({ ...formData, lpToken1Amount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lpToken2Amount">{strategy.token2} Amount</Label>
                <Input
                  id="lpToken2Amount"
                  type="number"
                  step="0.000001"
                  value={formData.lpToken2Amount}
                  onChange={(e) => setFormData({ ...formData, lpToken2Amount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lpToken1FeesEarned">{strategy.token1} Fees Earned (Cumulative)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lpToken1FeesEarned"
                    type="number"
                    step="0.000001"
                    value={formData.lpToken1FeesEarned}
                    onChange={(e) => setFormData({ ...formData, lpToken1FeesEarned: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    required
                  />
                  {fee1Delta !== null && formatDelta(fee1Delta)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lpToken2FeesEarned">{strategy.token2} Fees Earned (Cumulative)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lpToken2FeesEarned"
                    type="number"
                    step="0.000001"
                    value={formData.lpToken2FeesEarned}
                    onChange={(e) => setFormData({ ...formData, lpToken2FeesEarned: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    required
                  />
                  {fee2Delta !== null && formatDelta(fee2Delta)}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>LP Value (USD)</Label>
                <div className="text-lg font-semibold">
                  ${lpValueUsd.toFixed(2)}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hedge1">
          <AccordionTrigger>
            Hedge Position - {strategy.token1}
            {formData.hedge1PositionSize && formatPositionDirection(formData.hedge1PositionSize)}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hedge1PositionSize">Position Size ({strategy.token1})</Label>
                <Input
                  id="hedge1PositionSize"
                  type="number"
                  step="0.000001"
                  value={formData.hedge1PositionSize}
                  onChange={(e) => setFormData({ ...formData, hedge1PositionSize: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Negative for short"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge1EntryPrice">Entry Price (USD)</Label>
                <Input
                  id="hedge1EntryPrice"
                  type="number"
                  step="0.01"
                  value={formData.hedge1EntryPrice}
                  onChange={(e) => setFormData({ ...formData, hedge1EntryPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge1Leverage">Leverage</Label>
                <Input
                  id="hedge1Leverage"
                  type="number"
                  step="0.1"
                  value={formData.hedge1Leverage}
                  onChange={(e) => setFormData({ ...formData, hedge1Leverage: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge1MarginUsd">Margin Used (USD)</Label>
                <Input
                  id="hedge1MarginUsd"
                  type="number"
                  step="0.01"
                  value={formData.hedge1MarginUsd}
                  onChange={(e) => setFormData({ ...formData, hedge1MarginUsd: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge1FundingPaidUsd">Funding Paid (USD, Cumulative)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="hedge1FundingPaidUsd"
                    type="number"
                    step="0.01"
                    value={formData.hedge1FundingPaidUsd}
                    onChange={(e) => setFormData({ ...formData, hedge1FundingPaidUsd: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {funding1Delta !== null && formatDelta(funding1Delta)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge1LiquidationPrice">Liquidation Price (USD, optional)</Label>
                <Input
                  id="hedge1LiquidationPrice"
                  type="number"
                  step="0.01"
                  value={formData.hedge1LiquidationPrice}
                  onChange={(e) => setFormData({ ...formData, hedge1LiquidationPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hedge2">
          <AccordionTrigger>
            Hedge Position - {strategy.token2}
            {formData.hedge2PositionSize && formatPositionDirection(formData.hedge2PositionSize)}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hedge2PositionSize">Position Size ({strategy.token2})</Label>
                <Input
                  id="hedge2PositionSize"
                  type="number"
                  step="0.000001"
                  value={formData.hedge2PositionSize}
                  onChange={(e) => setFormData({ ...formData, hedge2PositionSize: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Negative for short"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge2EntryPrice">Entry Price (USD)</Label>
                <Input
                  id="hedge2EntryPrice"
                  type="number"
                  step="0.01"
                  value={formData.hedge2EntryPrice}
                  onChange={(e) => setFormData({ ...formData, hedge2EntryPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge2Leverage">Leverage</Label>
                <Input
                  id="hedge2Leverage"
                  type="number"
                  step="0.1"
                  value={formData.hedge2Leverage}
                  onChange={(e) => setFormData({ ...formData, hedge2Leverage: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge2MarginUsd">Margin Used (USD)</Label>
                <Input
                  id="hedge2MarginUsd"
                  type="number"
                  step="0.01"
                  value={formData.hedge2MarginUsd}
                  onChange={(e) => setFormData({ ...formData, hedge2MarginUsd: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge2FundingPaidUsd">Funding Paid (USD, Cumulative)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="hedge2FundingPaidUsd"
                    type="number"
                    step="0.01"
                    value={formData.hedge2FundingPaidUsd}
                    onChange={(e) => setFormData({ ...formData, hedge2FundingPaidUsd: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {funding2Delta !== null && formatDelta(funding2Delta)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hedge2LiquidationPrice">Liquidation Price (USD, optional)</Label>
                <Input
                  id="hedge2LiquidationPrice"
                  type="number"
                  step="0.01"
                  value={formData.hedge2LiquidationPrice}
                  onChange={(e) => setFormData({ ...formData, hedge2LiquidationPrice: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger>Account Metrics</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="accountEquityUsd">Account Equity (USD)</Label>
                <Input
                  id="accountEquityUsd"
                  type="number"
                  step="0.01"
                  value={formData.accountEquityUsd}
                  onChange={(e) => setFormData({ ...formData, accountEquityUsd: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Total Margin Used (USD)</Label>
                <div className="text-lg font-semibold text-muted-foreground">
                  {totalMarginUsed !== null ? `$${totalMarginUsed.toFixed(2)}` : '--'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Auto-calculated from individual positions
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total Funding Paid (USD)</Label>
                <div className="text-lg font-semibold text-muted-foreground">
                  {totalFundingPaid !== null ? `$${totalFundingPaid.toFixed(2)}` : '--'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Auto-calculated from individual positions
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : snapshotToEdit ? "Update Snapshot" : isInitial ? "Save Initial Snapshot" : "Save Snapshot"}
        </Button>
      </div>
    </form>
  )
}

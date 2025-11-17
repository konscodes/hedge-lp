"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatPositionSize } from "@/lib/hedgeMath"
import { format } from "date-fns"
import { Pencil } from "lucide-react"
import { SnapshotForm } from "./SnapshotForm"
import { useSnapshots } from "@/lib/hooks"
import { useStrategy } from "@/lib/hooks"

interface StrategySnapshotsProps {
  strategyId: string
}

export function StrategySnapshots({ strategyId }: StrategySnapshotsProps) {
  const { snapshots, loading, refetch } = useSnapshots(strategyId)
  const { strategy } = useStrategy(strategyId)
  const [editingSnapshot, setEditingSnapshot] = useState<any | null>(null)

  const getRebalanceBadge = (reason: string) => {
    if (reason === "NONE") return null
    const colors: Record<string, string> = {
      PRICE_MOVE: "bg-blue-500",
      DELTA_DRIFT: "bg-yellow-500",
      BOTH: "bg-purple-500",
      MANUAL: "bg-gray-500",
      CROSS_POSITION: "bg-orange-500",
    }
    return (
      <Badge className={colors[reason] || "bg-gray-500"}>
        {reason.replace("_", " ")}
      </Badge>
    )
  }

  const getQualityBadge = (score: number | null) => {
    if (score === null) return null
    if (score >= 0.8) {
      return <Badge className="bg-green-500">{(score * 100).toFixed(0)}%</Badge>
    } else if (score >= 0.6) {
      return <Badge className="bg-blue-500">{(score * 100).toFixed(0)}%</Badge>
    } else if (score >= 0.4) {
      return <Badge className="bg-yellow-500">{(score * 100).toFixed(0)}%</Badge>
    } else {
      return <Badge className="bg-red-500">{(score * 100).toFixed(0)}%</Badge>
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading snapshots...</div>
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create your first snapshot from the Overview tab
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshots ({snapshots.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>LP Price</TableHead>
                <TableHead>LP Value</TableHead>
                <TableHead>LP P&L</TableHead>
                {strategy && (
                  <>
                    <TableHead>Hedge1 ({strategy.token1})</TableHead>
                    <TableHead>Hedge1 P&L</TableHead>
                    <TableHead>Hedge2 ({strategy.token2})</TableHead>
                    <TableHead>Hedge2 P&L</TableHead>
                  </>
                )}
                <TableHead>Total Hedge P&L</TableHead>
                <TableHead>Funding</TableHead>
                <TableHead>Total P&L</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Rebalance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell className="text-xs">
                    {format(new Date(snapshot.timestamp), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs">
                    ${snapshot.lpPrice.toFixed(4)}
                  </TableCell>
                  <TableCell>${snapshot.lpValueUsd.toFixed(2)}</TableCell>
                  <TableCell className={snapshot.lpPnlUsd >= 0 ? "text-green-600" : "text-red-600"}>
                    ${snapshot.lpPnlUsd.toFixed(2)}
                  </TableCell>
                  {strategy && (
                    <>
                      <TableCell className="text-xs">
                        {snapshot.hedge1PositionSize.toFixed(3)}
                      </TableCell>
                      <TableCell className={snapshot.hedge1PnlUsd >= 0 ? "text-green-600" : "text-red-600"}>
                        ${snapshot.hedge1PnlUsd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {snapshot.hedge2PositionSize.toFixed(3)}
                      </TableCell>
                      <TableCell className={snapshot.hedge2PnlUsd >= 0 ? "text-green-600" : "text-red-600"}>
                        ${snapshot.hedge2PnlUsd.toFixed(2)}
                      </TableCell>
                    </>
                  )}
                  <TableCell className={snapshot.totalHedgePnlUsd >= 0 ? "text-green-600" : "text-red-600"}>
                    ${snapshot.totalHedgePnlUsd.toFixed(2)}
                  </TableCell>
                  <TableCell>${snapshot.fundingPaidUsd.toFixed(2)}</TableCell>
                  <TableCell className={snapshot.totalStrategyPnlUsd >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    ${snapshot.totalStrategyPnlUsd.toFixed(2)} ({snapshot.totalStrategyPnlPct.toFixed(2)}%)
                  </TableCell>
                  <TableCell>
                    {getQualityBadge(snapshot.hedgeQualityScore)}
                  </TableCell>
                  <TableCell>
                    {getRebalanceBadge(snapshot.rebalanceReason)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSnapshot(snapshot)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!editingSnapshot} onOpenChange={(open) => !open && setEditingSnapshot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Snapshot</DialogTitle>
            <DialogDescription>
              Edit snapshot from {editingSnapshot && format(new Date(editingSnapshot.timestamp), "MMM d, yyyy HH:mm")}
            </DialogDescription>
          </DialogHeader>
          {editingSnapshot && strategy && (
            <SnapshotForm
              strategy={strategy}
              snapshotToEdit={editingSnapshot}
              onSuccess={() => {
                setEditingSnapshot(null)
                refetch()
              }}
              onCancel={() => setEditingSnapshot(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

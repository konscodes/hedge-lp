"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SnapshotForm } from "./SnapshotForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StrategyOverviewButtonProps {
  strategy: any
}

export function StrategyOverviewButton({ strategy }: StrategyOverviewButtonProps) {
  const [showSnapshotForm, setShowSnapshotForm] = useState(false)
  const [lastSnapshot, setLastSnapshot] = useState<any>(null)

  useEffect(() => {
    if (strategy?.snapshots && strategy.snapshots.length > 0) {
      setLastSnapshot(strategy.snapshots[0])
    } else {
      setLastSnapshot(null)
    }
  }, [strategy])

  const handleSnapshotSaved = () => {
    setShowSnapshotForm(false)
    window.location.reload()
  }

  return (
    <>
      <Button onClick={() => setShowSnapshotForm(true)}>
        {lastSnapshot ? 'Log New Snapshot' : 'Log Initial Snapshot'}
      </Button>
      <Dialog open={showSnapshotForm} onOpenChange={setShowSnapshotForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lastSnapshot ? 'Log New Snapshot' : 'Log Initial Snapshot'}</DialogTitle>
            <DialogDescription>
              {lastSnapshot 
                ? 'Record a new snapshot of your strategy state'
                : 'Record your initial snapshot after opening LP and hedge positions'}
            </DialogDescription>
          </DialogHeader>
          <SnapshotForm
            strategy={strategy}
            lastSnapshot={lastSnapshot}
            onSuccess={handleSnapshotSaved}
            isInitial={!lastSnapshot}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}


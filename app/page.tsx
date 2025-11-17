"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StrategyForm } from "@/components/StrategyForm"

interface Strategy {
  id: string
  name: string
  token1: string
  token2: string
  lpProtocol: string
  perpVenue: string
  createdAt: string
  _count?: {
    snapshots: number
  }
}

export default function Home() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const res = await fetch("/api/strategies")
      const data = await res.json()
      setStrategies(data)
    } catch (error) {
      console.error("Error fetching strategies:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStrategyCreated = () => {
    setDialogOpen(false)
    fetchStrategies()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">LP Hedge Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your delta-hedged liquidity pool strategies
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Strategy</DialogTitle>
              <DialogDescription>
                Configure a new delta-hedged LP strategy
              </DialogDescription>
            </DialogHeader>
            <StrategyForm onSuccess={handleStrategyCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Strategies</CardTitle>
            <CardDescription>
              Create your first strategy to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Strategy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <Link key={strategy.id} href={`/strategies/${strategy.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{strategy.name}</CardTitle>
                  <CardDescription>
                    {strategy.token1}/{strategy.token2} on {strategy.lpProtocol}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Perp Venue:</span>
                      <span>{strategy.perpVenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Snapshots:</span>
                      <span>{strategy._count?.snapshots || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(strategy.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

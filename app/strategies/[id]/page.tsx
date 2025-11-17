"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { StrategyOverview } from "@/components/StrategyOverview"
import { StrategySnapshots } from "@/components/StrategySnapshots"
import { StrategyCharts } from "@/components/StrategyCharts"
import { StrategyConfig } from "@/components/StrategyConfig"
import { StrategyOverviewButton } from "@/components/StrategyOverviewButton"

export default function StrategyPage() {
  const params = useParams()
  const router = useRouter()
  const [strategy, setStrategy] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchStrategy()
    }
  }, [params.id])

  const fetchStrategy = async () => {
    try {
      const res = await fetch(`/api/strategies/${params.id}`)
      if (!res.ok) {
        throw new Error("Failed to fetch strategy")
      }
      const data = await res.json()
      setStrategy(data)
    } catch (error) {
      console.error("Error fetching strategy:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Strategy not found</p>
          <Link href="/">
            <Button>Back to Strategies</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Strategies
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{strategy.name}</h1>
        <p className="text-muted-foreground">
          {strategy.token1}/{strategy.token2} on {strategy.lpProtocol} • Hedged via {strategy.perpVenue}
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
          <StrategyOverviewButton strategy={strategy} />
        </div>

        <TabsContent value="overview" className="mt-6">
          <StrategyOverview strategy={strategy} onUpdate={fetchStrategy} />
        </TabsContent>

        <TabsContent value="snapshots" className="mt-6">
          <StrategySnapshots strategyId={strategy.id} />
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <StrategyCharts strategyId={strategy.id} />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <StrategyConfig strategy={strategy} onUpdate={fetchStrategy} />
        </TabsContent>
      </Tabs>
    </div>
  )
}


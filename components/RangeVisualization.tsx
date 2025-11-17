"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RangeVisualizationProps {
  currentPrice: number
  entryPrice: number
  pa: number
  pb: number
  priceDecimals?: number
}

export function RangeVisualization({
  currentPrice,
  entryPrice,
  pa,
  pb,
  priceDecimals = 2,
}: RangeVisualizationProps) {
  const width = 100 // Percentage width for visualization
  
  // Calculate positions (0 to 1)
  const currentPct = Math.max(0, Math.min(1, (currentPrice - pa) / (pb - pa)))
  const entryPct = Math.max(0, Math.min(1, (entryPrice - pa) / (pb - pa)))
  
  // Calculate bar positions
  const currentPos = currentPct * width
  const entryPos = entryPct * width
  
  // Calculate percentages from entry
  const lowerPct = ((pa - entryPrice) / entryPrice) * 100
  const upperPct = ((pb - entryPrice) / entryPrice) * 100
  const pctChange = ((currentPrice - entryPrice) / entryPrice) * 100
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Range</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual bar */}
        <div className="relative h-8 bg-muted rounded-md overflow-hidden">
          {/* Range fill */}
          <div
            className="absolute h-full bg-primary/20"
            style={{
              left: `${Math.min(currentPos, entryPos)}%`,
              width: `${Math.abs(currentPos - entryPos)}%`,
            }}
          />
          
          {/* Entry marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
            style={{ left: `${entryPos}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
              Entry
            </div>
          </div>
          
          {/* Current price marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary z-20"
            style={{ left: `${currentPos}%` }}
          >
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
              Current
            </div>
          </div>
          
          {/* Lower bound */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-destructive" />
          <div className="absolute -top-5 left-0 text-xs text-muted-foreground">
            ${pa.toFixed(priceDecimals)}
          </div>
          
          {/* Upper bound */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-destructive" />
          <div className="absolute -top-5 right-0 text-xs text-muted-foreground">
            ${pb.toFixed(priceDecimals)}
          </div>
        </div>
        
        {/* Info text */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Range:</span>
            <span>
              {lowerPct.toFixed(1)}% to {upperPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry Price:</span>
            <span>${entryPrice.toFixed(priceDecimals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Price:</span>
            <span className="font-medium">
              ${currentPrice.toFixed(priceDecimals)} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


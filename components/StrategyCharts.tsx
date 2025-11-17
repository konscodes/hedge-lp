"use client"

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { useSnapshots } from "@/lib/hooks"
import { useStrategy } from "@/lib/hooks"

interface StrategyChartsProps {
  strategyId: string
}

export function StrategyCharts({ strategyId }: StrategyChartsProps) {
  const { snapshots, loading } = useSnapshots(strategyId)
  const { strategy } = useStrategy(strategyId)
  
  // Reverse to show chronological order for charts
  const chartSnapshots = [...snapshots].reverse()

  if (loading) {
    return <div className="text-center py-8">Loading charts...</div>
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create snapshots to see charts
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = chartSnapshots.map((s) => ({
    timestamp: format(new Date(s.timestamp), "MMM d HH:mm"),
    date: new Date(s.timestamp).getTime(),
    lpPnl: s.lpPnlUsd,
    hedge1Pnl: s.hedge1PnlUsd,
    hedge2Pnl: s.hedge2PnlUsd,
    totalHedgePnl: s.totalHedgePnlUsd,
    totalPnl: s.totalStrategyPnlUsd,
    funding: s.fundingPaidUsd,
    fees: s.lpFeesUsd,
    quality: s.hedgeQualityScore ? s.hedgeQualityScore * 100 : null,
    lpPrice: s.lpPrice,
    lpValue: s.lpValueUsd,
    accountEquity: s.accountEquityUsd,
    totalValue: s.totalStrategyValueUsd,
    liquidationBuffer: s.liquidationBufferPct,
  }))

  // Calculate capital allocation for pie chart (from last snapshot)
  const lastSnapshot = snapshots[snapshots.length - 1]
  const capitalAllocationData = lastSnapshot ? [
    { name: 'LP', value: lastSnapshot.lpValueUsd },
    { name: 'Hedge', value: lastSnapshot.accountEquityUsd },
  ] : []

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Strategy P&L Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalPnl"
                stroke="#8884d8"
                fill="#8884d8"
                name="Total P&L"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LP vs Dual Hedge P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="lpPnl"
                stroke="#82ca9d"
                name="LP P&L"
              />
              {strategy && (
                <>
                  <Line
                    type="monotone"
                    dataKey="hedge1Pnl"
                    stroke="#ffc658"
                    name={`Hedge1 (${strategy.token1}) P&L`}
                  />
                  <Line
                    type="monotone"
                    dataKey="hedge2Pnl"
                    stroke="#ff7300"
                    name={`Hedge2 (${strategy.token2}) P&L`}
                  />
                </>
              )}
              <Line
                type="monotone"
                dataKey="totalHedgePnl"
                stroke="#8884d8"
                name="Total Hedge P&L"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capital Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="lpValue"
                stackId="1"
                stroke="#82ca9d"
                fill="#82ca9d"
                name="LP Value"
              />
              <Area
                type="monotone"
                dataKey="accountEquity"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name="Hedge Account Equity"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {lastSnapshot && capitalAllocationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Capital Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={capitalAllocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {capitalAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData.some(d => d.liquidationBuffer !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>Liquidation Buffer Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="liquidationBuffer"
                  stroke="#ff7300"
                  name="Liquidation Buffer (%)"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Funding vs Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="funding"
                stackId="1"
                stroke="#ff7300"
                fill="#ff7300"
                name="Funding Paid"
              />
              <Area
                type="monotone"
                dataKey="fees"
                stackId="1"
                stroke="#00ff00"
                fill="#00ff00"
                name="LP Fees"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hedge Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="#8884d8"
                name="Quality Score (%)"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

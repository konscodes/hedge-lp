import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const strategies = await prisma.strategy.findMany({
      include: {
        _count: {
          select: { snapshots: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(strategies)
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch strategies',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const strategy = await prisma.strategy.create({
      data: {
        name: body.name,
        token1: body.token1,
        token2: body.token2,
        lpProtocol: body.lpProtocol,
        perpVenue: body.perpVenue,
        startingCapitalUsd: body.startingCapitalUsd,
        openDate: body.openDate ? new Date(body.openDate) : new Date(),
        pa: body.pa,
        pb: body.pb,
        priceMoveThresholdPct: body.priceMoveThresholdPct ?? 0.02,
        deltaDriftThresholdPct: body.deltaDriftThresholdPct ?? 0.10,
        crossPositionRebalanceThresholdPct: body.crossPositionRebalanceThresholdPct ?? 0.20,
      }
    })
    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error creating strategy:', error)
    return NextResponse.json(
      { error: 'Failed to create strategy', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

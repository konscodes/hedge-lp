import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 100 // Limit to recent snapshots
        }
      }
    })
    
    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error fetching strategy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strategy' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name: body.name,
        token1: body.token1,
        token2: body.token2,
        lpProtocol: body.lpProtocol,
        perpVenue: body.perpVenue,
        startingCapitalUsd: body.startingCapitalUsd,
        openDate: body.openDate ? new Date(body.openDate) : undefined,
        pa: body.pa,
        pb: body.pb,
        priceMoveThresholdPct: body.priceMoveThresholdPct,
        deltaDriftThresholdPct: body.deltaDriftThresholdPct,
        crossPositionRebalanceThresholdPct: body.crossPositionRebalanceThresholdPct,
      }
    })
    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error updating strategy:', error)
    return NextResponse.json(
      { error: 'Failed to update strategy' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.strategy.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    )
  }
}

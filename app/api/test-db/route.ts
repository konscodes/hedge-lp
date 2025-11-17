import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Test endpoint to verify database connectivity
 * Access at: /api/test-db
 */
export async function GET() {
  try {
    // Test 1: Check environment variables
    const databaseUrl = process.env.DATABASE_URL || ''
    const hasAuthToken = !!process.env.TURSO_AUTH_TOKEN
    const isTurso = databaseUrl.startsWith('libsql://')
    
    const envCheck = {
      hasDatabaseUrl: !!databaseUrl,
      isTurso,
      hasAuthToken,
      urlPrefix: databaseUrl.substring(0, 30) + '...',
    }
    
    // Test 2: Try a simple query
    let queryResult = null
    let queryError = null
    
    try {
      const count = await prisma.strategy.count()
      queryResult = {
        success: true,
        strategyCount: count,
      }
    } catch (error) {
      queryError = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      }
    }
    
    // Test 3: Try to get Prisma client info
    const prismaInfo = {
      // Check if adapter is being used
      clientType: isTurso ? 'LibSQL adapter' : 'SQLite',
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        ...envCheck,
      },
      prisma: prismaInfo,
      query: queryResult || { success: false, error: queryError },
    }, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}


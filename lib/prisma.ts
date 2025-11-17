import { PrismaClient } from './generated/prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  // Always read from environment at runtime (important for serverless)
  const databaseUrl = process.env.DATABASE_URL || ''
  const isTurso = databaseUrl.startsWith('libsql://')

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // CRITICAL: Ensure DATABASE_URL is explicitly set in process.env
  // Prisma reads it from process.env even when using an adapter
  // This is necessary because Prisma validates the URL format before delegating to adapter
  if (process.env.DATABASE_URL !== databaseUrl) {
    process.env.DATABASE_URL = databaseUrl
  }

  if (isTurso) {
    // For Turso, use LibSQL adapter
    try {
      const libsqlUrl = new URL(databaseUrl)
      const authToken = process.env.TURSO_AUTH_TOKEN || libsqlUrl.searchParams.get('authToken') || undefined
      
      if (!authToken) {
        console.warn('⚠️  TURSO_AUTH_TOKEN not found - connection may fail')
      }
      
      // Create LibSQL client with config object
      const libsqlConfig: { url: string; authToken?: string } = {
        url: databaseUrl,
      }
      if (authToken) {
        libsqlConfig.authToken = authToken
      }
      
      const libsql = createClient(libsqlConfig)
      const adapter = new PrismaLibSQL(libsql as any)
      
      // Debug: Log to verify DATABASE_URL is available
      console.log('🔍 Initializing PrismaClient with adapter, DATABASE_URL:', databaseUrl.substring(0, 30) + '...')
      
      // When using an adapter, Prisma reads DATABASE_URL from process.env automatically
      // The adapter handles the actual connection
      const client = new PrismaClient({
        adapter: adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
      
      console.log('✅ PrismaClient created with LibSQL adapter')
      return client
    } catch (error) {
      console.error('❌ Error setting up LibSQL adapter:', error)
      console.error('DATABASE_URL at error time:', process.env.DATABASE_URL?.substring(0, 30))
      throw new Error(`Failed to initialize LibSQL adapter: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    // For local SQLite file-based database
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
}

// Use singleton pattern for serverless (reuse client across invocations)
export const prisma = globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production (serverless), also cache to avoid re-initialization
  globalForPrisma.prisma = prisma
}

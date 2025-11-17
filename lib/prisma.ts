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

  console.log('🔍 getPrismaClient called, DATABASE_URL:', databaseUrl.substring(0, 30) + '...')

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
      
      // CRITICAL: Prisma reads DATABASE_URL from process.env when queries execute
      // Ensure it's set before creating PrismaClient AND keep it set
      // The adapter uses LibSQL client's URL, but Prisma still validates DATABASE_URL
      // Use a valid file:// URL for validation (Prisma expects this for sqlite provider)
      const originalUrl = process.env.DATABASE_URL
      
      // Set valid file:// URL - Prisma will validate this format
      // The adapter will use the LibSQL client's URL for actual connection
      process.env.DATABASE_URL = 'file:./.tmp/dummy.db'
      
      console.log('🔍 Creating PrismaClient with adapter')
      console.log('   LibSQL URL:', databaseUrl.substring(0, 30) + '...')
      console.log('   Validation URL:', process.env.DATABASE_URL)
      
      const client = new PrismaClient({
        adapter: adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
      
      // IMPORTANT: Keep the file:// URL set - Prisma may read it during queries
      // Don't restore original URL - Prisma needs valid format for validation
      // The adapter handles the actual connection using LibSQL client
      
      console.log('✅ PrismaClient created with LibSQL adapter')
      return client
    } catch (error) {
      console.error('❌ Error setting up LibSQL adapter:', error)
      console.error('DATABASE_URL at error time:', process.env.DATABASE_URL)
      throw new Error(`Failed to initialize LibSQL adapter: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    // For local SQLite file-based database
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
}

// Lazy initialization - only create client when first accessed
// This ensures environment variables are available at runtime
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  
  const client = getPrismaClient()
  globalForPrisma.prisma = client
  return client
}

// Export a getter that initializes on first access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
}) as PrismaClient

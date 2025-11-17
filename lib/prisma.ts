import { PrismaClient } from './generated/prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  // Always read from environment at runtime (important for serverless)
  let databaseUrl = process.env.DATABASE_URL || ''
  const isTurso = databaseUrl.startsWith('libsql://')

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  console.log('🔍 getPrismaClient called')
  console.log('   Original DATABASE_URL:', databaseUrl.substring(0, 40) + '...')
  console.log('   Is Turso:', isTurso)

  if (isTurso) {
    // For Turso, use LibSQL adapter
    try {
      // CRITICAL: Save original URL before modifying process.env
      const originalLibsqlUrl = databaseUrl
      
      // Set valid file:// URL FIRST - Prisma validates URL format based on schema provider
      // The schema says provider="sqlite" which expects file:// protocol
      // We MUST set this BEFORE creating PrismaClient, and keep it set
      process.env.DATABASE_URL = 'file:./.tmp/dummy.db'
      
      console.log('   Set validation URL:', process.env.DATABASE_URL)
      console.log('   LibSQL URL (for adapter):', originalLibsqlUrl.substring(0, 40) + '...')
      
      const libsqlUrl = new URL(originalLibsqlUrl)
      const authToken = process.env.TURSO_AUTH_TOKEN || libsqlUrl.searchParams.get('authToken') || undefined
      
      if (!authToken) {
        console.warn('⚠️  TURSO_AUTH_TOKEN not found - connection may fail')
      }
      
      // Create LibSQL client with REAL libsql:// URL
      const libsqlConfig: { url: string; authToken?: string } = {
        url: originalLibsqlUrl, // Use original libsql:// URL
      }
      if (authToken) {
        libsqlConfig.authToken = authToken
      }
      
      const libsql = createClient(libsqlConfig)
      const adapter = new PrismaLibSQL(libsql as any)
      
      // Prisma will validate DATABASE_URL (now file://) but adapter uses LibSQL client's URL
      const client = new PrismaClient({
        adapter: adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
      
      // CRITICAL: Keep file:// URL set - Prisma reads it during queries
      // The adapter uses LibSQL client's URL for actual connection
      // DO NOT restore original URL - Prisma needs file:// format for validation
      
      console.log('✅ PrismaClient created with LibSQL adapter')
      console.log('   DATABASE_URL remains:', process.env.DATABASE_URL)
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

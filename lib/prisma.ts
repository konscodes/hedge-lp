import { PrismaClient } from './generated/prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're using Turso (LibSQL) or local SQLite
const databaseUrl = process.env.DATABASE_URL || ''
const isTurso = databaseUrl.startsWith('libsql://')

let prismaClient: PrismaClient

if (isTurso) {
  // For Turso, use LibSQL adapter
  // Extract auth token from URL if present, or use environment variable
  try {
    const libsqlUrl = new URL(databaseUrl)
    const authToken = process.env.TURSO_AUTH_TOKEN || libsqlUrl.searchParams.get('authToken') || undefined
    
    // Create LibSQL client with config object
    const libsqlConfig: { url: string; authToken?: string } = {
      url: databaseUrl,
    }
    if (authToken) {
      libsqlConfig.authToken = authToken
    }
    
    const libsql = createClient(libsqlConfig)
    
    // PrismaLibSQL expects the client, but TypeScript types might be mismatched
    // Using type assertion to work around this
    const adapter = new PrismaLibSQL(libsql as any)
    
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      adapter: adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Error setting up LibSQL adapter:', error)
    // Fallback to regular PrismaClient (will fail at runtime if URL is invalid)
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
} else {
  // For local SQLite file-based database
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

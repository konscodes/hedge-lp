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
  const libsqlUrl = new URL(databaseUrl)
  const authToken = process.env.TURSO_AUTH_TOKEN || libsqlUrl.searchParams.get('authToken') || undefined
  
  const libsql = createClient({
    url: databaseUrl,
    authToken: authToken,
  })
  
  const adapter = new PrismaLibSQL(libsql)
  
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
} else {
  // For local SQLite file-based database
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

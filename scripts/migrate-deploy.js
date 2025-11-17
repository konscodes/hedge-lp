#!/usr/bin/env node

/**
 * Migration script that handles both SQLite (file://) and Turso (libsql://) URLs
 * 
 * For Turso: Prisma migrations work, but we need to ensure the connection is valid
 * The LibSQL adapter handles the connection at runtime in lib/prisma.ts
 * 
 * Note: Prisma's SQLite provider validates URL format, but Turso migrations
 * work through Prisma's migration system when using the LibSQL adapter
 */

const { execSync } = require('child_process');
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const isTurso = databaseUrl.startsWith('libsql://');

console.log(`Database URL detected: ${isTurso ? 'Turso (LibSQL)' : 'Local SQLite'}`);

try {
  // For both Turso and SQLite, Prisma migrations work the same way
  // The LibSQL adapter (configured in lib/prisma.ts) handles Turso connections at runtime
  // Prisma migrations will work because Turso supports SQLite-compatible migrations
  console.log('Running Prisma migrations...');
  
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('✅ Migrations completed successfully');
} catch (error) {
  console.error('❌ Migration failed');
  console.error('Error details:', error.message);
  
  if (isTurso) {
    console.error('\n💡 Troubleshooting tips for Turso:');
    console.error('   1. Verify your DATABASE_URL is correct (should start with libsql://)');
    console.error('   2. Check that your Turso database is active');
    console.error('   3. Ensure you have the correct authentication token if required');
    console.error('   4. Try running migrations manually: npx prisma migrate deploy');
  }
  
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Migration script that handles both SQLite (file://) and Turso (libsql://) URLs
 * 
 * For Turso: Use `prisma db push` instead of `migrate deploy` because:
 * - Prisma's migrate deploy validates SQLite URLs require file:// protocol
 * - db push works with LibSQL URLs and applies schema directly
 * - Perfect for fresh databases or when you don't need migration history
 * 
 * For local SQLite: Use `migrate deploy` to maintain migration history
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
  if (isTurso) {
    // For Turso, use db push which works with LibSQL URLs
    // This applies the schema directly without migration validation
    console.log('Using Prisma db push for Turso (fresh schema)...');
    
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('✅ Schema pushed to Turso successfully');
  } else {
    // For local SQLite, use migrations to maintain history
    console.log('Using Prisma migrations for local SQLite...');
    
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('✅ Migrations completed successfully');
  }
} catch (error) {
  console.error('❌ Schema deployment failed');
  console.error('Error details:', error.message);
  
  if (isTurso) {
    console.error('\n💡 Troubleshooting tips for Turso:');
    console.error('   1. Verify your DATABASE_URL is correct (should start with libsql://)');
    console.error('   2. Check that your Turso database is active');
    console.error('   3. Ensure you have the correct authentication token if required');
    console.error('   4. Try running manually: npx prisma db push --accept-data-loss');
  }
  
  process.exit(1);
}

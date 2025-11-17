#!/usr/bin/env node

/**
 * Migration script that handles both SQLite (file://) and Turso (libsql://) URLs
 * 
 * For Turso: Skip schema deployment during build because:
 * - Prisma's schema validation requires file:// protocol for SQLite provider
 * - Schema should be applied manually via Turso CLI or dashboard before deployment
 * - The LibSQL adapter handles runtime connections correctly
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
    // For Turso, skip schema deployment during build
    // Prisma's SQLite provider validates URL format and requires file:// protocol
    // Schema should be applied manually before deployment using:
    //   turso db shell hedge-lp-konscodes < schema.sql
    // Or use Turso dashboard to run the SQL
    console.log('⚠️  Skipping schema deployment for Turso during build');
    console.log('   Prisma schema validation requires file:// protocol');
    console.log('   Schema should be applied manually before deployment');
    console.log('   The LibSQL adapter will handle runtime connections correctly');
    console.log('✅ Build can continue - schema will be applied separately');
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
  process.exit(1);
}

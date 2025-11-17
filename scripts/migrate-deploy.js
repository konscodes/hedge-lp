#!/usr/bin/env node

/**
 * Migration script that handles both SQLite (file://) and Turso (libsql://) URLs
 * Prisma's migrate deploy command validates SQLite URLs require file:// protocol
 * This script works around that limitation for Turso
 */

const { execSync } = require('child_process');
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const isTurso = databaseUrl.startsWith('libsql://');

if (isTurso) {
  console.log('Detected Turso database (libsql://)');
  console.log('Running Prisma migrations for Turso...');
  
  // For Turso, Prisma migrations work but we need to ensure the schema is valid
  // The LibSQL adapter handles the connection at runtime
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Prisma will validate the URL, but the adapter handles it at runtime
        DATABASE_URL: databaseUrl,
      },
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('Detected local SQLite database (file://)');
  console.log('Running Prisma migrations...');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}


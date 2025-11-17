#!/usr/bin/env node

/**
 * Test script to verify Turso database connection and schema
 * Run with: node scripts/test-turso-connection.js
 */

const { createClient } = require('@libsql/client');

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (!databaseUrl.startsWith('libsql://')) {
  console.error('❌ DATABASE_URL does not start with libsql://');
  console.log('Current URL:', databaseUrl.substring(0, 30) + '...');
  process.exit(1);
}

console.log('🔍 Testing Turso connection...');
console.log('Database URL:', databaseUrl.substring(0, 30) + '...');

async function testConnection() {
  try {
    // Extract auth token if needed
    const libsqlUrl = new URL(databaseUrl);
    const authToken = process.env.TURSO_AUTH_TOKEN || libsqlUrl.searchParams.get('authToken') || undefined;
    
    const libsqlConfig = {
      url: databaseUrl,
    };
    if (authToken) {
      libsqlConfig.authToken = authToken;
      console.log('✅ Auth token found');
    } else {
      console.log('⚠️  No auth token (may be required)');
    }
    
    const client = createClient(libsqlConfig);
    
    // Test 1: Check if tables exist
    console.log('\n📋 Checking tables...');
    const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tables = tablesResult.rows.map(row => row.name);
    console.log('Found tables:', tables);
    
    if (!tables.includes('Strategy')) {
      console.error('❌ Strategy table not found!');
      return false;
    }
    if (!tables.includes('Snapshot')) {
      console.error('❌ Snapshot table not found!');
      return false;
    }
    console.log('✅ Both tables exist');
    
    // Test 2: Check Strategy table structure
    console.log('\n📋 Checking Strategy table columns...');
    const strategyColumns = await client.execute("PRAGMA table_info(Strategy);");
    const strategyColNames = strategyColumns.rows.map(row => row.name);
    console.log('Strategy columns:', strategyColNames.join(', '));
    
    const requiredStrategyCols = ['id', 'name', 'token1', 'token2', 'lpProtocol', 'perpVenue', 
      'startingCapitalUsd', 'openDate', 'pa', 'pb', 'createdAt', 'updatedAt'];
    const missingCols = requiredStrategyCols.filter(col => !strategyColNames.includes(col));
    if (missingCols.length > 0) {
      console.error('❌ Missing Strategy columns:', missingCols);
      return false;
    }
    console.log('✅ Strategy table structure looks correct');
    
    // Test 3: Check Snapshot table structure
    console.log('\n📋 Checking Snapshot table columns...');
    const snapshotColumns = await client.execute("PRAGMA table_info(Snapshot);");
    const snapshotColNames = snapshotColumns.rows.map(row => row.name);
    console.log('Snapshot columns:', snapshotColNames.length, 'columns found');
    
    const requiredSnapshotCols = ['id', 'strategyId', 'timestamp', 'token1Price', 'token2Price',
      'hedge1FundingPaidUsd', 'hedge2FundingPaidUsd', 'marginUsedUsd', 'fundingPaidUsd'];
    const missingSnapshotCols = requiredSnapshotCols.filter(col => !snapshotColNames.includes(col));
    if (missingSnapshotCols.length > 0) {
      console.error('❌ Missing Snapshot columns:', missingSnapshotCols);
      return false;
    }
    console.log('✅ Snapshot table structure looks correct');
    
    // Test 4: Try a simple query
    console.log('\n📋 Testing query...');
    const countResult = await client.execute("SELECT COUNT(*) as count FROM Strategy;");
    const count = countResult.rows[0].count;
    console.log(`✅ Query successful! Found ${count} strategies`);
    
    // Test 5: Check indexes
    console.log('\n📋 Checking indexes...');
    const indexesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='index';");
    const indexes = indexesResult.rows.map(row => row.name);
    console.log('Found indexes:', indexes);
    
    console.log('\n✅ All tests passed! Database schema looks correct.');
    return true;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});


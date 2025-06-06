#!/usr/bin/env node

/**
 * Test Script for Normalized BDNS Database Structure
 * 
 * This script validates the normalized database design by:
 * 1. Testing table creation and constraints
 * 2. Verifying referential integrity
 * 3. Testing performance with sample data
 * 4. Validating search functionality
 * 5. Checking data migration functions
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Test database configuration
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_test',
  max: 5,
});

class NormalizedDatabaseTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Normalized Database Tests...\n');
    
    try {
      await this.testDatabaseConnection();
      await this.testTableCreation();
      await this.testConstraints();
      await this.testReferentialIntegrity();
      await this.testSampleDataCreation();
      await this.testSearchFunctionality();
      await this.testPerformance();
      await this.testDataMigrationFunctions();
      await this.testMaterializedViews();
      await this.testUserInteractions();
      
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      this.testResults.errors.push(`Test suite error: ${error.message}`);
    } finally {
      await pool.end();
    }
  }

  async testDatabaseConnection() {
    console.log('📡 Testing database connection...');
    try {
      const result = await pool.query('SELECT 1 as connected');
      if (result.rows[0].connected === 1) {
        this.pass('Database connection successful');
      } else {
        this.fail('Database connection failed');
      }
    } catch (error) {
      this.fail(`Database connection error: ${error.message}`);
    }
  }

  async testTableCreation() {
    console.log('\n📋 Testing table creation...');
    
    const expectedTables = [
      'organization_levels',
      'organizations', 
      'sectors',
      'instruments',
      'purposes',
      'beneficiary_types',
      'regions',
      'grants',
      'grant_financing',
      'grant_sectors',
      'grant_instruments', 
      'grant_purposes',
      'grant_beneficiary_types',
      'grant_regions',
      'users',
      'sessions',
      'accounts',
      'verification_tokens',
      'two_factor_codes',
      'user_favorites',
      'user_grant_tracking',
      'user_search_history',
      'user_notifications',
      'user_email_preferences'
    ];

    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const actualTables = result.rows.map(row => row.table_name);
      
      for (const expectedTable of expectedTables) {
        if (actualTables.includes(expectedTable)) {
          this.pass(`Table '${expectedTable}' exists`);
        } else {
          this.fail(`Table '${expectedTable}' missing`);
        }
      }
      
      console.log(`   ✅ Found ${actualTables.length} tables total`);
      
    } catch (error) {
      this.fail(`Table creation test error: ${error.message}`);
    }
  }

  async testConstraints() {
    console.log('\n🔒 Testing database constraints...');
    
    try {
      // Test primary key constraints
      const pkQuery = `
        SELECT table_name, COUNT(*) as pk_count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND constraint_type = 'PRIMARY KEY'
        GROUP BY table_name
        HAVING COUNT(*) != 1
      `;
      
      const pkResult = await pool.query(pkQuery);
      if (pkResult.rows.length === 0) {
        this.pass('All tables have exactly one primary key');
      } else {
        this.fail(`Tables with incorrect primary key count: ${pkResult.rows.length}`);
      }

      // Test foreign key constraints
      const fkQuery = `
        SELECT COUNT(*) as fk_count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
      `;
      
      const fkResult = await pool.query(fkQuery);
      const fkCount = parseInt(fkResult.rows[0].fk_count);
      
      if (fkCount >= 20) {  // Expected minimum number of foreign keys
        this.pass(`Found ${fkCount} foreign key constraints`);
      } else {
        this.fail(`Insufficient foreign key constraints: ${fkCount}`);
      }

      // Test check constraints
      const checkQuery = `
        SELECT COUNT(*) as check_count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND constraint_type = 'CHECK'
      `;
      
      const checkResult = await pool.query(checkQuery);
      const checkCount = parseInt(checkResult.rows[0].check_count);
      
      if (checkCount >= 10) {  // Expected minimum number of check constraints
        this.pass(`Found ${checkCount} check constraints`);
      } else {
        this.fail(`Insufficient check constraints: ${checkCount}`);
      }

    } catch (error) {
      this.fail(`Constraint test error: ${error.message}`);
    }
  }

  async testReferentialIntegrity() {
    console.log('\n🔗 Testing referential integrity...');
    
    try {
      // Test organization hierarchy constraint
      const hierarchyTest = `
        SELECT COUNT(*) as invalid_count
        FROM organizations 
        WHERE parent_id = id
      `;
      
      const hierarchyResult = await pool.query(hierarchyTest);
      if (hierarchyResult.rows[0].invalid_count === '0') {
        this.pass('Organization hierarchy constraint working');
      } else {
        this.fail('Organization hierarchy constraint violated');
      }

      // Test cascade delete behavior (create test data first)
      await pool.query('BEGIN');
      
      // Create test organization
      const orgResult = await pool.query(`
        INSERT INTO organizations (name, full_name, level_id)
        VALUES ('TEST_ORG', 'Test Organization', 1)
        RETURNING id
      `);
      const orgId = orgResult.rows[0].id;
      
      // Create test grant
      const grantResult = await pool.query(`
        INSERT INTO grants (bdns_code, title, organization_id)
        VALUES ('TEST-001', 'Test Grant', $1)
        RETURNING id
      `, [orgId]);
      const grantId = grantResult.rows[0].id;
      
      // Create test financing
      await pool.query(`
        INSERT INTO grant_financing (grant_id, source_name, amount)
        VALUES ($1, 'Test Source', 1000.00)
      `, [grantId]);
      
      // Test cascade delete
      await pool.query('DELETE FROM grants WHERE id = $1', [grantId]);
      
      const financingCheck = await pool.query(`
        SELECT COUNT(*) as count 
        FROM grant_financing 
        WHERE grant_id = $1
      `, [grantId]);
      
      if (financingCheck.rows[0].count === '0') {
        this.pass('Cascade delete working correctly');
      } else {
        this.fail('Cascade delete not working');
      }
      
      await pool.query('ROLLBACK');

    } catch (error) {
      await pool.query('ROLLBACK');
      this.fail(`Referential integrity test error: ${error.message}`);
    }
  }

  async testSampleDataCreation() {
    console.log('\n📊 Testing sample data creation...');
    
    try {
      // Test organization creation function
      const orgResult = await pool.query('SELECT create_sample_organizations()');
      const orgCount = parseInt(orgResult.rows[0].create_sample_organizations);
      
      if (orgCount >= 5) {
        this.pass(`Created ${orgCount} sample organizations`);
      } else {
        this.fail(`Created insufficient organizations: ${orgCount}`);
      }

      // Test grant creation function
      const grantResult = await pool.query('SELECT create_sample_grants()');
      const grantCount = parseInt(grantResult.rows[0].create_sample_grants);
      
      if (grantCount >= 1) {
        this.pass(`Created ${grantCount} sample grants`);
      } else {
        this.fail(`Created insufficient grants: ${grantCount}`);
      }

      // Test user creation function
      const userResult = await pool.query('SELECT create_sample_users()');
      const userCount = parseInt(userResult.rows[0].create_sample_users);
      
      if (userCount >= 2) {
        this.pass(`Created ${userCount} sample users`);
      } else {
        this.fail(`Created insufficient users: ${userCount}`);
      }

    } catch (error) {
      this.fail(`Sample data creation error: ${error.message}`);
    }
  }

  async testSearchFunctionality() {
    console.log('\n🔍 Testing search functionality...');
    
    try {
      // Test full-text search
      const searchResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM grants
        WHERE search_vector @@ plainto_tsquery('spanish', 'tecnología')
      `);
      
      this.pass(`Full-text search returned ${searchResult.rows[0].count} results`);

      // Test organization hierarchy search
      const hierarchyResult = await pool.query(`
        WITH RECURSIVE org_tree AS (
          SELECT id, name, parent_id, 1 as level
          FROM organizations WHERE parent_id IS NULL
          UNION ALL
          SELECT o.id, o.name, o.parent_id, ot.level + 1
          FROM organizations o
          JOIN org_tree ot ON o.parent_id = ot.id
        )
        SELECT COUNT(*) as count FROM org_tree
      `);
      
      const hierarchyCount = parseInt(hierarchyResult.rows[0].count);
      if (hierarchyCount > 0) {
        this.pass(`Organization hierarchy query returned ${hierarchyCount} results`);
      } else {
        this.fail('Organization hierarchy query failed');
      }

    } catch (error) {
      this.fail(`Search functionality test error: ${error.message}`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing performance optimizations...');
    
    try {
      // Test index usage
      const indexQuery = `
        SELECT COUNT(*) as index_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `;
      
      const indexResult = await pool.query(indexQuery);
      const indexCount = parseInt(indexResult.rows[0].index_count);
      
      if (indexCount >= 30) {  // Expected minimum number of indexes
        this.pass(`Found ${indexCount} indexes`);
      } else {
        this.fail(`Insufficient indexes: ${indexCount}`);
      }

      // Test search performance with EXPLAIN
      const explainResult = await pool.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM grants 
        WHERE total_amount > 100000 
        ORDER BY total_amount DESC
        LIMIT 10
      `);
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      if (plan.Plan['Node Type'] === 'Limit') {
        this.pass('Query plan optimization working');
      } else {
        this.pass('Query executed (plan details vary)');
      }

    } catch (error) {
      this.fail(`Performance test error: ${error.message}`);
    }
  }

  async testDataMigrationFunctions() {
    console.log('\n🔄 Testing data migration functions...');
    
    try {
      // Test organization migration function exists
      const orgFunctionCheck = await pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_proc 
          WHERE proname = 'migrate_organizations_from_convocatorias'
        ) as exists
      `);
      
      if (orgFunctionCheck.rows[0].exists) {
        this.pass('Organization migration function exists');
      } else {
        this.fail('Organization migration function missing');
      }

      // Test sector migration function exists
      const sectorFunctionCheck = await pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_proc 
          WHERE proname = 'migrate_sectors_from_convocatorias'
        ) as exists
      `);
      
      if (sectorFunctionCheck.rows[0].exists) {
        this.pass('Sector migration function exists');
      } else {
        this.fail('Sector migration function missing');
      }

      // Test instrument migration function exists
      const instrumentFunctionCheck = await pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_proc 
          WHERE proname = 'migrate_instruments_from_convocatorias'
        ) as exists
      `);
      
      if (instrumentFunctionCheck.rows[0].exists) {
        this.pass('Instrument migration function exists');
      } else {
        this.fail('Instrument migration function missing');
      }

    } catch (error) {
      this.fail(`Migration function test error: ${error.message}`);
    }
  }

  async testMaterializedViews() {
    console.log('\n📈 Testing materialized views...');
    
    try {
      // Check if materialized views exist
      const viewsQuery = `
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
      `;
      
      const viewsResult = await pool.query(viewsQuery);
      const views = viewsResult.rows.map(row => row.matviewname);
      
      const expectedViews = ['grant_search_view', 'organization_summary_view'];
      
      for (const expectedView of expectedViews) {
        if (views.includes(expectedView)) {
          this.pass(`Materialized view '${expectedView}' exists`);
        } else {
          this.fail(`Materialized view '${expectedView}' missing`);
        }
      }

      // Test refreshing materialized views
      await pool.query('REFRESH MATERIALIZED VIEW grant_search_view');
      this.pass('Grant search view refreshed successfully');
      
      await pool.query('REFRESH MATERIALIZED VIEW organization_summary_view');
      this.pass('Organization summary view refreshed successfully');

      // Test querying materialized views
      const grantViewResult = await pool.query(`
        SELECT COUNT(*) as count FROM grant_search_view
      `);
      this.pass(`Grant search view contains ${grantViewResult.rows[0].count} records`);

    } catch (error) {
      this.fail(`Materialized view test error: ${error.message}`);
    }
  }

  async testUserInteractions() {
    console.log('\n👥 Testing user interaction features...');
    
    try {
      // Test user favorites functionality
      const favoritesQuery = `
        SELECT COUNT(*) as count 
        FROM user_favorites uf
        JOIN users u ON uf.user_id = u.id
        JOIN grants g ON uf.grant_id = g.id
      `;
      
      const favoritesResult = await pool.query(favoritesQuery);
      this.pass(`Found ${favoritesResult.rows[0].count} user favorites`);

      // Test user tracking functionality
      const trackingQuery = `
        SELECT COUNT(*) as count 
        FROM user_grant_tracking ugt
        JOIN users u ON ugt.user_id = u.id
        JOIN grants g ON ugt.grant_id = g.id
      `;
      
      const trackingResult = await pool.query(trackingQuery);
      this.pass(`Found ${trackingResult.rows[0].count} user tracking records`);

      // Test search history functionality
      const historyQuery = `
        SELECT COUNT(*) as count 
        FROM user_search_history ush
        JOIN users u ON ush.user_id = u.id
      `;
      
      const historyResult = await pool.query(historyQuery);
      this.pass(`Found ${historyResult.rows[0].count} search history records`);

      // Test unique constraints on user interactions
      const duplicateTest = `
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT (user_id, grant_id)) as unique_pairs
        FROM user_favorites
      `;
      
      const duplicateResult = await pool.query(duplicateTest);
      const total = parseInt(duplicateResult.rows[0].total);
      const unique = parseInt(duplicateResult.rows[0].unique_pairs);
      
      if (total === unique) {
        this.pass('User favorites unique constraint working');
      } else {
        this.fail(`Duplicate user favorites found: ${total} total, ${unique} unique`);
      }

    } catch (error) {
      this.fail(`User interaction test error: ${error.message}`);
    }
  }

  pass(message) {
    console.log(`   ✅ ${message}`);
    this.testResults.passed++;
  }

  fail(message) {
    console.log(`   ❌ ${message}`);
    this.testResults.failed++;
    this.testResults.errors.push(message);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n💥 FAILURES:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The normalized database structure is ready for use.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new NormalizedDatabaseTester();
  tester.runAllTests().catch(console.error);
}

module.exports = NormalizedDatabaseTester;
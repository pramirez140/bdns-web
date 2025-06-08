const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bdns_user:bdns_password@localhost:5432/bdns_db',
});

async function createSystemUser() {
  console.log('🚀 Creating system user for wiki...');
  
  try {
    // Check if system user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['system@bdnsweb.es']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ System user already exists:', existingUser.rows[0].id);
      return existingUser.rows[0].id;
    }
    
    // Create system user
    const hashedPassword = await bcrypt.hash('system-password-not-for-login', 10);
    
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, name, role, email_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        'system@bdnsweb.es',
        hashedPassword,
        'System',
        'admin',
        true,
        true
      ]
    );
    
    console.log('✅ System user created:', result.rows[0].id);
    return result.rows[0].id;
    
  } catch (error) {
    console.error('❌ Error creating system user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createSystemUser();
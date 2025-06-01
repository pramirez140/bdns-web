import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function getServerSession(req: NextRequest) {
  const token = await getToken({ req })
  
  if (!token) return null
  
  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [token.id]
    )
    
    if (result.rows.length === 0) return null
    
    const user = result.rows[0]
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organization_name,
        organizationType: user.organization_type,
      }
    }
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}
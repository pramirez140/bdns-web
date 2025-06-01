import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Get 2FA status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const result = await pool.query(
      'SELECT two_factor_enabled, two_factor_email FROM users WHERE email = $1',
      [session.user.email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      enabled: result.rows[0].two_factor_enabled || false,
      emailEnabled: result.rows[0].two_factor_email || false,
    })
  } catch (error) {
    console.error('Error fetching 2FA status:', error)
    return NextResponse.json(
      { error: 'Error al obtener el estado 2FA' },
      { status: 500 }
    )
  }
}

// Update 2FA status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { enabled } = body

    // Update 2FA settings
    await pool.query(
      'UPDATE users SET two_factor_enabled = $1, two_factor_email = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [enabled, session.user.email]
    )

    return NextResponse.json({
      message: enabled ? '2FA activado correctamente' : '2FA desactivado correctamente',
      enabled,
    })
  } catch (error) {
    console.error('Error updating 2FA status:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el estado 2FA' },
      { status: 500 }
    )
  }
}
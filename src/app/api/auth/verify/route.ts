import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token de verificación requerido' },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email_verification_token = $1 AND email_verified = false',
      [token]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido o ya utilizado' },
        { status: 400 }
      )
    }

    const user = userResult.rows[0]

    // Update user to mark as verified
    await pool.query(
      `UPDATE users 
       SET email_verified = true, 
           email_verification_token = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    )

    return NextResponse.json({
      message: 'Email verificado exitosamente',
      email: user.email
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Error al verificar el email' },
      { status: 500 }
    )
  }
}
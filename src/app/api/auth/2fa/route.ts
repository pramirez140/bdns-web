import { NextRequest, NextResponse } from 'next/server'
import { BDNSDatabase } from '@/lib/database'
import { send2FACode } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      )
    }

    const db = new BDNSDatabase()

    // Check if user exists and has 2FA enabled
    const userResult = await db.query(
      'SELECT id, name, two_factor_enabled, two_factor_email FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    if (!user.two_factor_enabled || !user.two_factor_email) {
      return NextResponse.json(
        { error: '2FA no está habilitado para este usuario' },
        { status: 400 }
      )
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store code in database with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    // Delete any existing unused codes for this user
    await db.query(
      'DELETE FROM two_factor_codes WHERE user_id = $1 AND used = false',
      [user.id]
    )
    
    // Insert new code
    await db.query(
      `INSERT INTO two_factor_codes (user_id, code, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationCode, expiresAt]
    )

    // Send 2FA code via email
    const emailResult = await send2FACode(email, user.name, verificationCode)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Error enviando código de verificación' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Código de verificación enviado',
      codeSent: true
    })

  } catch (error) {
    console.error('Error sending 2FA code:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email y código requeridos' },
        { status: 400 }
      )
    }

    const db = new BDNSDatabase()

    // Verify the code
    const verificationResult = await db.query(
      `SELECT tfc.id, u.id as user_id, u.name, u.email
       FROM two_factor_codes tfc
       JOIN users u ON tfc.user_id = u.id
       WHERE u.email = $1 AND tfc.code = $2 AND tfc.used = false
       AND tfc.expires_at > NOW()`,
      [email, code]
    )

    if (verificationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Código de verificación inválido o expirado' },
        { status: 400 }
      )
    }

    const user = verificationResult.rows[0]

    // Mark the code as used
    await db.query('UPDATE two_factor_codes SET used = true WHERE id = $1', [verificationResult.rows[0].id])

    return NextResponse.json({
      message: 'Código verificado correctamente',
      verified: true,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Error verifying 2FA code:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
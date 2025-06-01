import { NextRequest, NextResponse } from 'next/server'
import { BDNSDatabase } from '@/lib/database'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

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

    // Check if user exists and is not already verified
    const userResult = await db.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    if (user.email_verified) {
      return NextResponse.json(
        { error: 'El email ya está verificado' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex')
    
    // Update user with new verification token
    await db.query(
      'UPDATE users SET email_verification_token = $1 WHERE id = $2',
      [verificationToken, user.id]
    )

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    )

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Error enviando email de verificación' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Email de verificación reenviado exitosamente',
      emailSent: true
    })

  } catch (error) {
    console.error('Error resending verification email:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
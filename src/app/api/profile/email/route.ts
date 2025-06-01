import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Pool } from 'pg'
import { z } from 'zod'
import crypto from 'crypto'
import { sendEmailChangeVerification, sendVerificationEmail } from '@/lib/email'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Validation schemas
const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Email inválido'),
})

const verifyEmailChangeSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
})

// Request email change
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = requestEmailChangeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { newEmail } = validationResult.data

    // Check if new email is same as current
    if (newEmail.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'El nuevo email es igual al actual' },
        { status: 400 }
      )
    }

    // Check if new email is already in use
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [newEmail]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya está en uso' },
        { status: 400 }
      )
    }

    // Generate verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store email change request
    await pool.query(
      `UPDATE users 
       SET email_change_token = $1, 
           email_change_new_email = $2, 
           email_change_expires = $3,
           email_change_code = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $5`,
      [verificationToken, newEmail, expiresAt, verificationCode, session.user.email]
    )

    // Send verification emails
    const emailResult = await sendEmailChangeVerification(
      session.user.email,
      newEmail,
      session.user.name || 'Usuario',
      verificationCode
    )

    if (!emailResult.success) {
      // Rollback the change request
      await pool.query(
        `UPDATE users 
         SET email_change_token = NULL, 
             email_change_new_email = NULL, 
             email_change_expires = NULL,
             email_change_code = NULL
         WHERE email = $1`,
        [session.user.email]
      )

      return NextResponse.json(
        { error: 'Error al enviar el email de verificación. Verifica tu configuración SMTP.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Se ha enviado un código de verificación a tu email actual',
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error requesting email change:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}

// Verify email change
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
    
    // Validate input
    const validationResult = verifyEmailChangeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code } = validationResult.data

    // Get email change request
    const result = await pool.query(
      `SELECT email_change_new_email, email_change_expires, email_change_code 
       FROM users 
       WHERE email = $1 AND email_change_token IS NOT NULL`,
      [session.user.email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay solicitud de cambio de email pendiente' },
        { status: 400 }
      )
    }

    const emailChangeRequest = result.rows[0]

    // Check if expired
    if (new Date() > new Date(emailChangeRequest.email_change_expires)) {
      // Clear expired request
      await pool.query(
        `UPDATE users 
         SET email_change_token = NULL, 
             email_change_new_email = NULL, 
             email_change_expires = NULL,
             email_change_code = NULL
         WHERE email = $1`,
        [session.user.email]
      )

      return NextResponse.json(
        { error: 'El código de verificación ha expirado' },
        { status: 400 }
      )
    }

    // Verify code
    if (code !== emailChangeRequest.email_change_code) {
      return NextResponse.json(
        { error: 'Código de verificación incorrecto' },
        { status: 400 }
      )
    }

    const newEmail = emailChangeRequest.email_change_new_email

    // Update email and mark as unverified
    await pool.query(
      `UPDATE users 
       SET email = $1,
           email_verified = false,
           email_verification_token = $2,
           email_change_token = NULL, 
           email_change_new_email = NULL, 
           email_change_expires = NULL,
           email_change_code = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $3`,
      [newEmail, crypto.randomBytes(32).toString('hex'), session.user.email]
    )

    // Send verification email to new address
    const userResult = await pool.query(
      'SELECT name, email_verification_token FROM users WHERE email = $1',
      [newEmail]
    )
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0]
      await sendVerificationEmail(
        newEmail,
        user.name || 'Usuario',
        user.email_verification_token
      )
    }

    return NextResponse.json({
      message: 'Email actualizado correctamente. Por favor, inicia sesión con tu nuevo email y verifica tu cuenta.',
      newEmail: newEmail,
    })
  } catch (error) {
    console.error('Error verifying email change:', error)
    return NextResponse.json(
      { error: 'Error al verificar el cambio de email' },
      { status: 500 }
    )
  }
}

// Cancel email change
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Clear email change request
    await pool.query(
      `UPDATE users 
       SET email_change_token = NULL, 
           email_change_new_email = NULL, 
           email_change_expires = NULL,
           email_change_code = NULL
       WHERE email = $1`,
      [session.user.email]
    )

    return NextResponse.json({
      message: 'Solicitud de cambio de email cancelada',
    })
  } catch (error) {
    console.error('Error canceling email change:', error)
    return NextResponse.json(
      { error: 'Error al cancelar el cambio de email' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/email'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  sector: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [validatedData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Create user
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, name, organization_name, organization_type,
        phone, province, sector, email_verification_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, name, role, created_at`,
      [
        validatedData.email,
        hashedPassword,
        validatedData.name,
        validatedData.organizationName || null,
        validatedData.organizationType || null,
        validatedData.phone || null,
        validatedData.province || null,
        validatedData.sector || null,
        verificationToken,
      ]
    )

    const user = result.rows[0]

    // Create email preferences with defaults
    await pool.query(
      'INSERT INTO email_preferences (user_id) VALUES ($1)',
      [user.id]
    )

    // Send verification email (in development, just log it)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Email verification link (DEVELOPMENT):')
      console.log(`http://localhost:3001/auth/verify?token=${verificationToken}`)
    } else {
      await sendVerificationEmail(user.email, user.name, verificationToken)
    }

    return NextResponse.json({
      message: process.env.NODE_ENV === 'development' 
        ? 'Usuario creado exitosamente. En desarrollo: revisa la consola del servidor para el enlace de verificación.'
        : 'Usuario creado exitosamente. Por favor, verifica tu email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...(process.env.NODE_ENV === 'development' && {
        verificationLink: `http://localhost:3001/auth/verify?token=${verificationToken}`
      })
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    )
  }
}
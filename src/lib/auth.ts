import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data

          try {
            const result = await pool.query(
              'SELECT * FROM users WHERE email = $1 AND is_active = true',
              [email]
            )

            const user = result.rows[0]
            if (!user) return null

            const passwordsMatch = await bcrypt.compare(password, user.password_hash)
            if (passwordsMatch) {
              // Update last login
              await pool.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
              )

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizationName: user.organization_name,
                organizationType: user.organization_type,
                emailVerified: user.email_verified,
              }
            }
          } catch (error) {
            console.error('Authentication error:', error)
          }
        }

        return null
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [user.email]
          )

          if (existingUser.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
              `INSERT INTO users (email, name, email_verified, role, provider) 
               VALUES ($1, $2, $3, $4, $5) 
               RETURNING *`,
              [user.email, user.name, true, 'client', 'google']
            )
            user.id = newUser.rows[0].id
          } else {
            user.id = existingUser.rows[0].id
            // Update last login
            await pool.query(
              'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
              [user.id]
            )
          }
        } catch (error) {
          console.error('OAuth sign in error:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token, trigger, newSession }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
        session.user.organizationName = token.organizationName
        session.user.organizationType = token.organizationType
        
        // Always check current email verification status from database
        // but cache it for 30 seconds during testing (5 minutes in production)
        const now = Date.now()
        const cacheTime = process.env.NODE_ENV === 'development' ? 30 * 1000 : 5 * 60 * 1000
        
        if (!token.emailVerifiedChecked || (now - token.emailVerifiedChecked) > cacheTime) {
          try {
            const userResult = await pool.query(
              'SELECT email_verified FROM users WHERE id = $1',
              [token.id]
            )
            if (userResult.rows.length > 0) {
              token.emailVerified = userResult.rows[0].email_verified
              token.emailVerifiedChecked = now
            }
          } catch (error) {
            console.error('Error checking email verification status:', error)
            // If there's an error, use the cached value or default to false
            if (token.emailVerified === undefined) {
              token.emailVerified = false
            }
          }
        }
        
        session.user.emailVerified = token.emailVerified
      }
      
      // Handle session updates
      if (trigger === "update") {
        if (newSession?.user?.name) {
          session.user.name = newSession.user.name
          // Also update the token for persistence
          token.name = newSession.user.name
        }
        if (newSession?.user?.emailVerified !== undefined) {
          session.user.emailVerified = newSession.user.emailVerified
          // Also update the token for persistence
          token.emailVerified = newSession.user.emailVerified
        }
      }
      
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationName = user.organizationName
        token.organizationType = user.organizationType
        token.emailVerified = user.emailVerified
      }
      
      // Handle updates to the token
      if (trigger === "update") {
        if (session?.user?.name) {
          token.name = session.user.name
        }
        if (session?.user?.emailVerified !== undefined) {
          token.emailVerified = session.user.emailVerified
        }
      }
      
      return token
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
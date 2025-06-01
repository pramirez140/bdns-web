import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      organizationName?: string
      organizationType?: string
      emailVerified?: boolean
      createdAt?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    organizationName?: string
    organizationType?: string
    emailVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    organizationName?: string
    organizationType?: string
    emailVerified?: boolean
    emailVerifiedChecked?: number
  }
}
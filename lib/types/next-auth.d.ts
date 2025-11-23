import { DefaultSession } from 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      sdisId: string
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    sdisId: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role
    sdisId?: string
  }
}
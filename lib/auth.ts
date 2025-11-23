import { auth } from '@/auth'
import { cache } from 'react'

// Cache pour éviter les appels multiples dans un rendu
export const getCurrentUser = cache(async () => {
  const session = await auth()
  return session?.user
})

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  const userRole = user.role ?? ''
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }
  return user
}
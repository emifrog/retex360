import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/', '/login', '/register']

export default auth((req: NextRequest) => {
  const { pathname } = req.nextUrl
  const isAuth = Boolean(req.auth)
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!isAuth && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuth && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/admin') && req.auth?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

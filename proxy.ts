import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production'
)

// Only protect admin - buyer/seller dashboards handle their own auth state
const PROTECTED: { path: string; roles: string[] }[] = [
  { path: '/admin', roles: ['ADMIN'] },
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const rule = PROTECTED.find(r => pathname.startsWith(r.path))
  if (!rule) return NextResponse.next()

  const token = req.cookies.get('co_session')?.value
  if (!token) return NextResponse.redirect(new URL('/auth/login', req.url))

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string
    if (!rule.roles.includes(role)) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}

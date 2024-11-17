import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    return res
  }

  if (!session && req.nextUrl.pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  if (session && req.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/extract-data', req.url))
  }

  return res
}

export const config = {
  matcher: ['/extract-data', '/auth', '/auth/callback'],
} 
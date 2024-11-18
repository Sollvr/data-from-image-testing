import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if it exists
  const { data: { session }, error } = await supabase.auth.getSession()

  // Special case for callback
  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    return res
  }

  // Force redirect to extract-data if authenticated
  if (session && req.nextUrl.pathname === '/auth') {
    const redirectUrl = new URL('/extract-data', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Force redirect to auth if not authenticated
  if (!session && req.nextUrl.pathname !== '/auth') {
    const redirectUrl = new URL('/auth', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/extract-data',
    '/auth',
    '/auth/callback'
  ]
} 



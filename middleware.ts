import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Handle auth callback
  if (req.nextUrl.pathname === '/auth/callback') {
    return res
  }

  // Protect routes
  if (!session && req.nextUrl.pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Redirect from auth page if already logged in
  if (session && req.nextUrl.pathname === '/auth') {
    return NextResponse.redirect(new URL('/extract-data', req.url))
  }

  return res
}

export const config = {
  matcher: ['/extract-data', '/auth', '/auth/callback'],
} 



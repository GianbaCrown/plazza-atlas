import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? ''
const COOKIE_NAME = 'plazza_access'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow admin routes through to Supabase auth middleware
  if (pathname.startsWith('/admin')) {
    return await updateSession(request)
  }

  // Check for valid access cookie
  const cookie = request.cookies.get(COOKIE_NAME)
  if (cookie?.value === SITE_PASSWORD) {
    return NextResponse.next()
  }

  // Allow the password form page and its POST action
  if (pathname === '/gate') {
    return NextResponse.next()
  }

  // Redirect everything else to the gate
  const url = request.nextUrl.clone()
  url.pathname = '/gate'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/submit).*)'],
}
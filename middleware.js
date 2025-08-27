// middleware.js (at repo root)
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

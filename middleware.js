// middleware.js
import { updateSession } from './utils/supabase/middleware';

export async function middleware(request) {
  return updateSession(request);
}

// let it run for everything except static assets/images, tweak as you like
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
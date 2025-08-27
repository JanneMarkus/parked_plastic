// /middleware.js
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request) {
  // This will refresh cookies (access/refresh) when needed,
  // so SSR getServerSideProps sees a valid session.
  return updateSession(request);
}

// Don’t run on static assets / images / common crawlers, but do run everywhere else.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
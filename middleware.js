// middleware.js (at project root)
export { updateSession as middleware } from "./utils/supabase/middleware";

// Optionally scope where it runs (add/remove paths as you like)
export const config = {
  matcher: [
    // run on all app routes that may read auth cookies (tune as you wish)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

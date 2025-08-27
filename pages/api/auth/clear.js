// pages/api/auth/clear.js
import { createServerClient } from "@supabase/ssr";

export default async function handler(req, res) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return req.cookies[name];
          },
          set(name, value, options) {
            // set a clearing cookie
            res.setHeader("Set-Cookie", [
              ...(Array.isArray(res.getHeader("Set-Cookie"))
                ? res.getHeader("Set-Cookie")
                : res.getHeader("Set-Cookie")
                ? [res.getHeader("Set-Cookie")]
                : []),
              `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            ]);
          },
          remove(name, options) {
            res.setHeader("Set-Cookie", [
              ...(Array.isArray(res.getHeader("Set-Cookie"))
                ? res.getHeader("Set-Cookie")
                : res.getHeader("Set-Cookie")
                ? [res.getHeader("Set-Cookie")]
                : []),
              `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            ]);
          },
        },
      }
    );

    // signing out server-side clears httpOnly cookies
    await supabase.auth.signOut();
    res.status(200).json({ ok: true });
  } catch {
    // Even if something fails, return ok so the client can proceed
    res.status(200).json({ ok: true });
  }
}

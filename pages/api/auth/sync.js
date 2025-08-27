// pages/api/auth/sync.js
// Called by onAuthStateChange to keep SSR cookies in sync with the client.
import { createServerClient } from "@supabase/ssr";

export default async function handler(req, res) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => req.cookies[name],
          set: (name, value, options) => {
            res.setHeader("Set-Cookie", [
              ...(Array.isArray(res.getHeader("Set-Cookie"))
                ? res.getHeader("Set-Cookie")
                : res.getHeader("Set-Cookie")
                ? [res.getHeader("Set-Cookie")]
                : []),
              `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; ${
                options?.maxAge === 0 ? "Max-Age=0" : ""
              }`,
            ]);
          },
          remove: (name, options) => {
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

    // Touch auth to ensure cookies reflect the latest client session
    await supabase.auth.getUser();
    res.status(200).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
}

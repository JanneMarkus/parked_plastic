// pages/api/auth/clear.js
import { createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";

export default async function handler(req, res) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return req.cookies[name];
          },
          set(name, value, options) {
            const prev = res.getHeader("Set-Cookie");
            const next = serialize(name, value, options);
            res.setHeader("Set-Cookie", prev ? [].concat(prev, next) : [next]);
          },
          remove(name, options) {
            const prev = res.getHeader("Set-Cookie");
            const next = serialize(name, "", { ...options, maxAge: 0 });
            res.setHeader("Set-Cookie", prev ? [].concat(prev, next) : [next]);
          },
        },
      }
    );

    // This clears the httpOnly auth cookies via the adapter above
    await supabase.auth.signOut();
    res.status(200).json({ ok: true });
  } catch {
    // Even if something fails, return ok so the client can proceed
    res.status(200).json({ ok: true });
  }
}

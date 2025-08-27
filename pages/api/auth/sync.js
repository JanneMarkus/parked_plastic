// pages/api/auth/sync.js
// Called by onAuthStateChange to keep SSR cookies in sync with the client.
import { createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";

export default async function handler(req, res) {
  try {
    // Parse the posted event + session (we only need the tokens)
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const event = body?.event || null;
    const access_token = body?.session?.access_token || null;
    const refresh_token = body?.session?.refresh_token || null;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => req.cookies[name],
          set: (name, value, options) => {
            const prev = res.getHeader("Set-Cookie");
            const next = serialize(name, value, options);
            res.setHeader("Set-Cookie", prev ? [].concat(prev, next) : [next]);
          },
          remove: (name, options) => {
            const prev = res.getHeader("Set-Cookie");
            const next = serialize(name, "", { ...options, maxAge: 0 });
            res.setHeader("Set-Cookie", prev ? [].concat(prev, next) : [next]);
          },
        },
      }
    );

    if (access_token && refresh_token) {
      // Client is signed in → set/refresh httpOnly cookies to match
      await supabase.auth.setSession({ access_token, refresh_token });
      res.status(200).json({ ok: true, synced: true });
      return;
    }

    // No tokens posted → if this was a sign-out (or invalid), clear cookies
    if (event === "SIGNED_OUT" || !access_token) {
      await supabase.auth.signOut();
    }

    res.status(200).json({ ok: true, synced: false });
  } catch {
    // Be lenient; don’t brick the UI if something goes wrong
    res.status(200).json({ ok: true, synced: false });
  }
}

// /pages/api/auth/signin.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Cache-Control", "no-store");

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const supabase = createSupabaseServerClient({ req, res });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = /invalid login/i.test(error.message)
        ? "Invalid email or password"
        : error.message || "Sign-in failed";
      return res.status(401).json({ error: msg });
    }

    const session = data?.session ?? null;
    const user = data?.user ?? null;

    // ---- PATCH: set default full_name if null ----
    if (user?.id) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && !profile.full_name) {
          const defaultName = (user.email || email || "")
            .split("@")[0]
            .slice(0, 50); // keep it safe length-wise
          if (defaultName) {
            await supabase
              .from("profiles")
              .update({ full_name: defaultName })
              .eq("id", user.id);
          }
        }
      } catch (err) {
        // non-fatal; don't block sign-in
        console.error("Failed to patch full_name:", err);
      }
    }

    // ---- DEBUG (dev only): what cookies are actually on this response? ----
    const setCookieHeader = res.getHeader("Set-Cookie");
    const cookieLines = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
      ? [setCookieHeader]
      : [];

    if (process.env.NODE_ENV !== "production") {
      res.setHeader("X-Debug-Set-Cookie-Count", String(cookieLines.length));
    }

    return res.status(200).json({
      ok: true,
      user: user ? { id: user.id, email: user.email ?? null } : null,
      hasSession: Boolean(session),
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_at: session?.expires_at ?? null,
      ...(process.env.NODE_ENV !== "production"
        ? {
            debugSetCookie: cookieLines,
            debugCookieNames: cookieLines.map((c) =>
              String(c).split(";")[0].split("=")[0]
            ),
          }
        : {}),
    });
  } catch {
    return res.status(500).json({ error: "Sign-in failed" });
  }
}

// /pages/api/auth/signup.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Avoid caching signup responses
  res.setHeader("Cache-Control", "no-store");

  try {
    const { email, password, redirectTo } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // Derive a safe default origin if redirectTo isn't provided
    const proto =
      (req.headers["x-forwarded-proto"] || "").split(",")[0] ||
      (req.headers.referer?.startsWith("https") ? "https" : "http");
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const inferredOrigin =
      host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || null;

    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo
        ? redirectTo
        : inferredOrigin
        ? `${inferredOrigin}/login`
        : undefined;

    // IMPORTANT: use the server client wired with { req, res } so Supabase can set cookies
    const supabase = createSupabaseServerClient({ req, res });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      // Normalize a couple common cases for UX friendliness
      const raw = String(error.message || "");
      let msg = raw || "Sign-up failed";

      if (/already registered/i.test(raw) || error.code === "user_already_registered") {
        msg = "That email is already registered.";
      } else if (/email not confirmed/i.test(raw) || error.code === "email_not_confirmed") {
        msg = "Please confirm your email before signing in.";
      }

      return res.status(400).json({ error: msg });
    }

    const session = data?.session ?? null;
    const user = data?.user ?? null;

    // If confirmations are ON, session will be null and Supabase will have emailed the user.
    // If confirmations are OFF, session may be present and httpOnly cookies are already set.

    return res.status(200).json({
      ok: true,
      user: user ? { id: user.id, email: user.email ?? null } : null,
      hasSession: Boolean(session),
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_at: session?.expires_at ?? null, // unix seconds
      // Convenience flag for the UI: true when we did NOT receive a session (confirmations enabled)
      emailConfirmationLikelySent: !session,
    });
  } catch {
    return res.status(500).json({ error: "Sign-up failed" });
  }
}

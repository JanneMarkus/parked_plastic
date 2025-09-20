// /pages/api/auth/signup.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

/** Minimal cookie parser (avoids adding a dep) */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  String(header)
    .split(";")
    .map((v) => v.trim())
    .forEach((pair) => {
      const idx = pair.indexOf("=");
      if (idx > -1)
        out[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
    });
  return out;
}

/** Create a profile if missing (best-effort; ignore RLS errors) */
async function ensureProfileRow(supabase, userId, email) {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle();

    // Derive a default name from email local-part
    const defaultName = email ? email.split("@")[0] : null;

    if (existing) {
      if (!existing.full_name && defaultName) {
        await supabase
          .from("profiles")
          .update({ full_name: defaultName })
          .eq("id", userId);
      }
      return true;
    }

    await supabase
      .from("profiles")
      .insert({ id: userId, full_name: defaultName, public_email: email })
      .throwOnError();

    return true;
  } catch {
    return false;
  }
}

/** Generate a short unique referral code and store it if absent */
async function ensureReferralCode(supabase, userId) {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (existing?.referral_code) return existing.referral_code;

    const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

    for (let i = 0; i < 5; i++) {
      const candidate = makeCode();
      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: candidate })
        .eq("id", userId);
      if (!error) return candidate;
    }

    const fallback = (Math.random().toString(36) + Math.random().toString(36))
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 10)
      .toUpperCase();

    await supabase
      .from("profiles")
      .update({ referral_code: fallback })
      .eq("id", userId);
    return fallback;
  } catch {
    return null;
  }
}

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
    const inferredOrigin = host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL || null;

    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo
        ? redirectTo
        : inferredOrigin
        ? `${inferredOrigin}/login`
        : undefined;

    // IMPORTANT: use the server client wired with { req, res } so Supabase can set cookies
    const supabase = createSupabaseServerClient({ req, res });

    // ---- PRECHECK (best-effort): does a profile already exist with this email?
    // This helps produce a friendly "already registered" before we even call signUp.
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("public_email", email)
        .maybeSingle();

      if (existingProfile) {
        return res.status(409).json({
          error: "That email is already registered. Try signing in instead.",
        });
      }
    } catch {
      // ignore precheck errors; we'll still normalize signUp errors below
    }

    // 1) Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: inferredOrigin
          ? `${inferredOrigin}/api/auth/confirm?type=signup&next=/login`
          : undefined,
      },
    });

    if (error) {
      // Normalize common “already exists” variants
      const raw = `${error.code || ""} ${error.message || ""}`;
      if (
        /user_already_registered/i.test(raw) ||
        /already registered/i.test(raw) ||
        /already exists/i.test(raw) ||
        /duplicate key/i.test(raw) ||
        /23505/.test(raw) // PG unique_violation
      ) {
        return res.status(409).json({
          error: "That email is already registered. Try signing in instead.",
        });
      }

      // Email confirmation required
      if (
        /email not confirmed/i.test(raw) ||
        error.code === "email_not_confirmed"
      ) {
        return res
          .status(400)
          .json({ error: "Please confirm your email before signing in." });
      }

      // Fallback
      return res.status(400).json({ error: error.message || "Sign-up failed" });
    }

    const session = data?.session ?? null;
    const user = data?.user ?? null;

    // 2) Referral plumbing (best-effort; won't block signup)
    if (user?.id) {
      // Ensure profile row exists (or skip if RLS blocks)
      await ensureProfileRow(supabase, user.id, user.email ?? email);

      // Ensure the new user has a referral_code
      await ensureReferralCode(supabase, user.id);

      // If a referral cookie is present, attribute once
      try {
        const cookies = parseCookies(req.headers.cookie || "");
        const refCode = cookies.ref || null;

        if (refCode) {
          // Resolve inviter
          const { data: inviter } = await supabase
            .from("profiles")
            .select("id, referral_code")
            .eq("referral_code", refCode)
            .maybeSingle();

          if (inviter && inviter.id !== user.id) {
            // Only set if not already set
            await supabase
              .from("profiles")
              .update({ referred_by: inviter.id })
              .eq("id", user.id)
              .is("referred_by", null);

            // Optional audit/event row (if the table exists)
            try {
              await supabase.from("referral_events").insert({
                ref_code: refCode,
                inviter_id: inviter.id,
                invitee_id: user.id,
                event_type: "signup",
              });
            } catch {
              // ignore if table doesn't exist
            }
          }
        }
      } catch {
        // non-fatal
      }
    }

    return res.status(200).json({
      ok: true,
      user: user ? { id: user.id, email: user.email ?? null } : null,
      hasSession: Boolean(session),
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      expires_at: session?.expires_at ?? null, // unix seconds
      emailConfirmationLikelySent: !session, // true when we did NOT receive a session (confirmations enabled)
    });
  } catch {
    return res.status(500).json({ error: "Sign-up failed" });
  }
}

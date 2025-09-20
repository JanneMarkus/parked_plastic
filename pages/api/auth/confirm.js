// /pages/api/auth/confirm.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "no-store");
  const vary = String(res.getHeader("Vary") || "");
  if (!/\bCookie\b/i.test(vary)) res.setHeader("Vary", vary ? `${vary}, Cookie` : "Cookie");

  const token_hash = typeof req.query.token_hash === "string" ? req.query.token_hash : "";
  const type = typeof req.query.type === "string" ? req.query.type : "";
  const rawNext = typeof req.query.next === "string" ? req.query.next : "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!token_hash || !type) {
    return res.redirect(302, `/login?error=${encodeURIComponent("Missing token")}`);
  }

  try {
    const supabase = createSupabaseServerClient({ req, res });

    // This sets the auth cookies on your domain when successful
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      console.error("[auth/confirm] verifyOtp error:", error);
      return res.redirect(302, `/login?error=${encodeURIComponent(error.message)}`);
    }

    // 303 to avoid re-submitting if the browser retries
    res.writeHead(303, { Location: next });
    return res.end();
  } catch (e) {
    console.error("[auth/confirm] unexpected error:", e);
    return res.redirect(302, `/login?error=${encodeURIComponent("Confirmation failed")}`);
  }
}

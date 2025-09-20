// pages/api/auth/update-password.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "no-store");
  const vary = String(res.getHeader("Vary") || "");
  if (!/\bCookie\b/i.test(vary)) res.setHeader("Vary", vary ? `${vary}, Cookie` : "Cookie");

  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const supabase = createSupabaseServerClient({ req, res });

    // This call uses the server session from HttpOnly cookies (set by /api/auth/confirm)
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return res.status(400).json({ error: error.message });

    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: "Failed to update password." });
  }
}

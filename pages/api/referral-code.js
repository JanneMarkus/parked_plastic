// /pages/api/referral-code.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  // Small cache guard; this result depends on auth cookies
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createSupabaseServerClient({ req, res });
    const { data: { user } = {} } = await supabase.auth.getUser();

    if (!user) {
      // not signed in → no code; client will fall back to homepage
      return res.status(200).json({ code: null });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return res.status(200).json({ code: null });
    return res.status(200).json({ code: data?.referral_code || null });
  } catch {
    return res.status(200).json({ code: null });
  }
}

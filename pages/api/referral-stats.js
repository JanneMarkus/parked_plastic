// /pages/api/referral-stats.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const supabase = createSupabaseServerClient({ req, res });

  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) return res.status(200).json({ code: null, inviteUrl: null, visits: 0, signups: 0 });

  // Get code
  const { data: prof } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();

  const code = prof?.referral_code || null;

  // Counts (best-effort; both tables optional)
  let visits = 0, signups = 0;
  try {
    const { count: vCount } = await supabase
      .from("referral_events")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", user.id)
      .eq("event_type", "visit");
    visits = vCount || 0;
  } catch {}

  try {
    // Either from events…
    const { count: sCountFromEvents } = await supabase
      .from("referral_events")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", user.id)
      .eq("event_type", "signup");

    // …or from profiles.referred_by as a fallback
    const { count: sCountFromProfiles } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id);

    signups = Math.max(sCountFromEvents || 0, sCountFromProfiles || 0);
  } catch {}

  const origin =
    (req.headers["x-forwarded-proto"] ? req.headers["x-forwarded-proto"].split(",")[0] : null) &&
    (req.headers["x-forwarded-host"] || req.headers.host)
      ? `${req.headers["x-forwarded-proto"].split(",")[0]}://${req.headers["x-forwarded-host"] || req.headers.host}`
      : process.env.NEXT_PUBLIC_SITE_URL || "";

  const inviteUrl = code && origin ? `${origin}/r/${code}` : origin || null;

  return res.status(200).json({ code, inviteUrl, visits, signups });
}

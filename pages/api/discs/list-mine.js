// pages/api/discs/list-mine.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createSupabaseServerClient({ req, res });
    const { data: { user } = {}, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return res.status(401).json({ error: "Not authenticated" });

    const status = (req.query.status || "").toString();
    let q = supabase.from("discs").select("*").eq("owner", user.id).order("created_at", { ascending: false });
    if (status && status !== "all") q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ data: data || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("list-mine error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

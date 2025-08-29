// pages/api/discs/update-status.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const supabase = createSupabaseServerClient({ req, res });
    const { data: { user } = {}, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return res.status(401).json({ error: "Not authenticated" });

    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: "Missing id or status" });

    // Optional: validate allowed values
    const allowed = new Set(["active", "pending", "sold"]);
    if (!allowed.has(status)) return res.status(400).json({ error: "Invalid status" });

    const { data, error } = await supabase
      .from("discs")
      .update({ status })
      .eq("id", id)
      .eq("owner", user.id)
      .select("id")
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(403).json({ error: "No row updated (ownership/RLS)" });

    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("update-status error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

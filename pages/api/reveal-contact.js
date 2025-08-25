// /pages/api/reveal-contact.js
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  try {
    const admin = getAdminSupabase();

    if (req.method === "GET") {
      // Peek only: ?listingId=abc
      const listingId = req.query.listingId;
      if (!listingId) return res.status(400).json({ error: "Missing listingId" });

      const { data: disc, error: discErr } = await admin
        .from("discs")
        .select("owner")
        .eq("id", listingId)
        .single();
      if (discErr || !disc) return res.status(404).json({ error: "Listing not found" });

      const { data: profile, error: profErr } = await admin
        .from("profiles")
        .select("public_email, phone, messenger")
        .eq("id", disc.owner)
        .maybeSingle();
      if (profErr) return res.status(500).json({ error: "Failed to read profile" });

      const hasContact = Boolean(
        (profile?.public_email && String(profile.public_email).trim()) ||
        (profile?.phone && String(profile.phone).trim()) ||
        (profile?.messenger && String(profile.messenger).trim())
      );

      return res.status(200).json({ ok: true, hasContact });
    }

    if (req.method === "POST") {
      // Full reveal (unchanged)
      const { listingId } = req.body || {};
      if (!listingId) return res.status(400).json({ error: "Missing listingId" });

      const { data: disc, error: discErr } = await admin
        .from("discs")
        .select("owner, is_sold")
        .eq("id", listingId)
        .single();
      if (discErr || !disc) return res.status(404).json({ error: "Listing not found" });

      const { data: profile, error: profErr } = await admin
        .from("profiles")
        .select("public_email, phone, messenger")
        .eq("id", disc.owner)
        .maybeSingle();
      if (profErr) return res.status(500).json({ error: "Failed to read profile" });

      const contact = {
        public_email: (profile?.public_email || "").trim(),
        phone: (profile?.phone || "").trim(),
        messenger: (profile?.messenger || "").trim(),
      };

      return res.status(200).json({ ok: true, contact });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  res.setHeader("Cache-Control", "no-store");



  const supabase = createSupabaseServerClient({ req, res });
  const { data: { user } = {}, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Not authenticated" });

  const { public_email, phone, messenger, home_course } = req.body || {};
  const hc = home_course ?? null;
  const payload = {
    id: user.id,
    public_email: public_email ?? null,
    phone: phone ?? null,
    messenger: messenger ?? null,
    home_course: hc,
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

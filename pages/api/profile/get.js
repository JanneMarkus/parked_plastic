import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  res.setHeader("Cache-Control", "no-store");

  const supabase = createSupabaseServerClient({ req, res });
  const { data: { user } = {}, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase
    .from("profiles")
    .select("public_email, phone, messenger, home_course")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data: data || { public_email: null, phone: null, messenger: null } });
}

// pages/api/auth/user.js
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const supabase = createSupabaseServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();
    if (error) return res.status(200).json({ user: null });
    const u = data?.user || null;
    return res.status(200).json({
      user: u ? { id: u.id, email: u.email ?? null, user_metadata: u.user_metadata ?? {} } : null,
    });
  } catch {
    return res.status(200).json({ user: null });
  }
}
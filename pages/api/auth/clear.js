// pages/api/auth/clear.js
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
 res.setHeader("Cache-Control", "no-store");
 const vary = String(res.getHeader("Vary") || "");
 if (!/\bCookie\b/i.test(vary)) res.setHeader("Vary", vary ? `${vary}, Cookie` : "Cookie");
  try {
    const supabase = createSupabaseServerClient({ req, res })
    await supabase.auth.signOut()    // clears httpOnly auth cookies
    res.status(204).end()
  } catch (e) {
   // Don’t leak details; still return no content
   res.status(204).end()
  }
}

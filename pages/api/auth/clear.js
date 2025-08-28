// pages/api/auth/clear.js
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function handler(req, res) {
  try {
    const supabase = createSupabaseServerClient({ req, res })
    await supabase.auth.signOut()    // clears httpOnly auth cookies
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(200).json({ ok: true })
  }
}

// pages/api/auth/callback.js
import { createSupabaseServerClient } from '@/utils/supabase/server' // from earlier

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient({ req, res })
  // Example: when provider redirects back with code
  const { data, error } = await supabase.auth.exchangeCodeForSession(req.url)
  if (error) return res.redirect(302, '/login?error=oauth')
  // Cookies are now set server-side
  return res.redirect(302, '/account')
}
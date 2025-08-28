// utils/supabase/middleware.js
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const defaults = { httpOnly: true, sameSite: 'lax', path: '/' }

export async function updateSession(request) {
  const res = NextResponse.next()
  const secure = process.env.NODE_ENV === 'production'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...defaults, secure, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', maxAge: 0, ...defaults, secure, ...options })
        },
      },
    }
  )

  // Fast local verification (JWKS-backed) with server fallback
  const { error } = await supabase.auth.getClaims()
  if (error) await supabase.auth.getUser()

  return res
}
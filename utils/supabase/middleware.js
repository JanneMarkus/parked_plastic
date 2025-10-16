// utils/supabase/middleware.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const defaults = { httpOnly: true, sameSite: "lax", path: "/" };

export async function updateSession(request) {
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";

  // Compute cookie domain consistently with utils/supabase/server.js
  const xfHost = (request.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  const rawHost = xfHost || request.headers.get("host") || "";
  const host = rawHost.split(":")[0];
  const rootDomain =
    host.endsWith(".parkedplastic.com") || host === "parkedplastic.com"
      ? ".parkedplastic.com"
      : undefined;
  const FALLBACK_DOMAIN = process.env.AUTH_COOKIE_DOMAIN; // optional override
  const domain = secure && (rootDomain || FALLBACK_DOMAIN) ? (rootDomain || FALLBACK_DOMAIN) : undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...defaults, secure, ...(domain ? { domain } : {}), ...options });
        },
        remove(name, options) {
          res.cookies.set({
            name,
            value: "",
            maxAge: 0,
            ...defaults,
            secure,
            ...(domain ? { domain } : {}),
            ...options,
          });
        },
      },
    }
  );

  // Touch the session (passive); avoids redirects and lets refresh rotation happen.
  try {
    await supabase.auth.getUser();
  } catch {}

  // Non-cacheable + vary on cookies
  if (!res.headers.get("Cache-Control")) res.headers.set("Cache-Control", "no-store");
  const vary = res.headers.get("Vary") || "";
  if (!/\bCookie\b/i.test(vary)) res.headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");

  return res;
}

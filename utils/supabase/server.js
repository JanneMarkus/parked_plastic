// utils/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { serialize, parse } from "cookie";

export function createSupabaseServerClient({ req, res }) {
  const isProd = process.env.NODE_ENV === "production";

  const xfHost = (req?.headers?.["x-forwarded-host"] || "")
    .split(",")[0]
    ?.trim();
  const rawHost = xfHost || req?.headers?.host || "";
  const host = rawHost.split(":")[0]; // strip port if present
  const rootDomain =
    host.endsWith(".parkedplastic.com") || host === "parkedplastic.com"
      ? ".parkedplastic.com"
      : undefined;
  const FALLBACK_DOMAIN = process.env.AUTH_COOKIE_DOMAIN; // e.g. ".parkedplastic.com"
  const baseDefaults = {
    path: "/",
    sameSite: "lax",
    ...(isProd && (rootDomain || FALLBACK_DOMAIN)
      ? { domain: rootDomain || FALLBACK_DOMAIN }
      : {}),
  };

  function appendSetCookie(nextCookie) {
    const prev = res.getHeader("Set-Cookie");
    const list = Array.isArray(prev) ? prev : prev ? [prev] : [];
    res.setHeader("Set-Cookie", Array.from(new Set([...list, nextCookie])));
  }

  if (!res.getHeader("Cache-Control"))
    res.setHeader("Cache-Control", "no-store");
  const vary = String(res.getHeader("Vary") || "");
  if (!/\bCookie\b/i.test(vary)) {
    res.setHeader("Vary", vary ? `${vary}, Cookie` : "Cookie");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          if (req?.cookies && typeof req.cookies[name] !== "undefined") {
            return req.cookies[name];
          }
          const header = req?.headers?.cookie || "";
          return parse(header)[name];
        },
        set(name, value, options) {
          // IMPORTANT: app options first, then defaults, then force flags
          const cookie = serialize(name, value, {
            ...options,
            ...baseDefaults,
            httpOnly: true, // force HttpOnly
            secure: isProd, // force Secure on HTTPS
          });
          appendSetCookie(cookie);
        },
        remove(name, options) {
          const cookie = serialize(name, "", {
            ...options,
            ...baseDefaults,
            httpOnly: true, // force HttpOnly
            secure: isProd, // force Secure on HTTPS
            maxAge: 0,
            expires: new Date(0),
          });
          appendSetCookie(cookie);
        },
      },
    }
  );
}

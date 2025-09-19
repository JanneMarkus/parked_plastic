// pages/r/[code].js
import { createSupabaseServerClient } from "@/utils/supabase/server";

/** minimal cookie serializer (avoid extra deps) */
function serializeCookie(name, value, { maxAge, path = "/", httpOnly = true, sameSite = "Lax", secure } = {}) {
  const enc = encodeURIComponent;
  let str = `${name}=${enc(String(value))}`;
  if (maxAge) str += `; Max-Age=${Math.floor(maxAge)}`;
  if (path) str += `; Path=${path}`;
  if (httpOnly) str += `; HttpOnly`;
  if (sameSite) str += `; SameSite=${sameSite}`;
  if (secure) str += `; Secure`;
  return str;
}

export async function getServerSideProps(ctx) {
  const { code } = ctx.params || {};
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });

  let inviter = null;

  // Validate the code (only set cookie if real)
  if (code) {
    const { data } = await supabase
      .from("profiles")
      .select("id, referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    inviter = data || null;
  }

  if (inviter) {
    // 30 days
    const cookie = serializeCookie("ref", code, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    ctx.res.setHeader("Set-Cookie", cookie);

    // Optional: log a "visit" event (best-effort)
    try {
      await supabase.from("referral_events").insert({
        ref_code: code,
        inviter_id: inviter.id,
        event_type: "visit",
        user_agent: ctx.req.headers["user-agent"] || null,
        // ip_hash: you can add a server-side salted hash if you want
      });
    } catch {
      // ignore if table/policy not present
    }
  }

  return {
    redirect: {
      destination: "/?ref=1", // harmless hint param if you want to track client-side
      permanent: false,
    },
  };
}

export default function ReferralRedirect() {
  return null;
}

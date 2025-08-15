// pages/auth/callback.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

function sanitizeRedirectPath(raw) {
  if (typeof raw !== "string") return "/";
  if (raw.startsWith("//")) return "/";
  if (/^[a-zA-Z]+:\/\//.test(raw)) return "/";
  return raw.startsWith("/") ? raw : "/";
}

async function upsertProfile(user) {
  const payload = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
  };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const next = sanitizeRedirectPath(url.searchParams.get("redirect") || "/");

      try {
        // Prefer modern PKCE: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
        }

        // Fallback: legacy implicit flow with tokens in the hash
        if (window.location.hash.includes("access_token")) {
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          } else {
            throw new Error("Missing access_token/refresh_token in callback hash.");
          }
        }

        // Ensure a profile row exists
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user || null;
        if (user) await upsertProfile(user);

        setMsg("Signed in. Redirecting…");
        window.history.replaceState({}, "", next);
        if (active) router.replace(next);
      } catch (e) {
        console.error("Auth callback error:", e);
        setErr(e?.message || "Could not complete sign-in.");
        setMsg("");
      }
    })();
    return () => { active = false; };
  }, [router]);

  return (
    <main className="wrap">
      <Head>
        <title>Signing in… — Parked Plastic</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx>{`
        .wrap { max-width: 520px; margin: 48px auto; padding: 0 16px; }
        .card { background:#fff; border:1px solid #E9E9E9; border-radius:14px; box-shadow:0 4px 10px rgba(0,0,0,.05); padding:22px; }
        .ok { background:#f4fff9; border:1px solid #d1f5e5; color:#1a6a58; padding:10px 12px; border-radius:10px; }
        .err { background:#fff5f4; border:1px solid #ffd9d5; color:#8c2f28; padding:10px 12px; border-radius:10px; }
        .btn { margin-top: 12px; border:2px solid #279989; color:#279989; border-radius:10px; padding:10px 14px; font-weight:700; background:#fff; cursor:pointer; }
        .btn:hover { background:#279989; color:#fff; }
      `}</style>
      <div className="card">
        {msg && <div className="ok" aria-live="polite">{msg}</div>}
        {err && (
          <>
            <div className="err" aria-live="assertive">{err}</div>
            <button className="btn" onClick={() => router.replace("/")}>Back to home</button>
          </>
        )}
      </div>
    </main>
  );
}

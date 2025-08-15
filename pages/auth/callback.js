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

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof window === "undefined") return;

      // Figure out where to go next
      const url = new URL(window.location.href);
      const next = sanitizeRedirectPath(url.searchParams.get("redirect") || "/");

      try {
        // 1) PKCE code flow (?code=...)
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
        }
        // 2) Implicit flow (#access_token=...)
        if (window.location.hash.includes("access_token")) {
          // Parse & store session from the URL hash
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
        }
        setMsg("Signed in. Redirecting…");
        // Clean URL then go to intended page
        window.history.replaceState({}, "", next);
        if (active) router.replace(next);
      } catch (e) {
        console.error(e);
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

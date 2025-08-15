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
  // `onConflict` works in v2; in v1 it's ignored but upsert still works on PK
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

// Handle both v1 and v2 clients gracefully
async function setSessionCompat({ code, access_token, refresh_token }) {
  // Prefer modern PKCE code exchange
  if (code) {
    if (typeof supabase.auth.exchangeCodeForSession === "function") {
      // v2
      const { error } = await supabase.auth.exchangeCodeForSession({ code });
      if (error) throw error;
      return;
    }
    if (supabase.auth.api && typeof supabase.auth.api.exchangeCodeForSession === "function") {
      // v1
      const { data, error } = await supabase.auth.api.exchangeCodeForSession(code);
      if (error) throw error;
      // v1 needs access token set explicitly
      if (data?.access_token && typeof supabase.auth.setAuth === "function") {
        supabase.auth.setAuth(data.access_token);
      }
      return;
    }
    throw new Error("No method available to exchange authorization code.");
  }

  // Legacy implicit flow with tokens in the hash
  if (access_token) {
    if (typeof supabase.auth.setSession === "function") {
      // v2
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return;
    }
    if (typeof supabase.auth.setAuth === "function") {
      // v1 (stores only access token; refresh handled by server on next login)
      supabase.auth.setAuth(access_token);
      return;
    }
    throw new Error("No method available to set access token.");
  }

  // Nothing to set
}

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const next = sanitizeRedirectPath(url.searchParams.get("redirect") || "/");

        // 1) Extract tokens
        const code = url.searchParams.get("code");
        let access_token = null;
        let refresh_token = null;

        if (window.location.hash && window.location.hash.includes("access_token")) {
          const hash = new URLSearchParams(window.location.hash.slice(1));
          access_token = hash.get("access_token");
          refresh_token = hash.get("refresh_token");
        }

        // 2) Establish supabase session (handles both v1/v2)
        await setSessionCompat({ code, access_token, refresh_token });

        // 3) Ensure profile exists
        // v2: getSession; v1: getUser
        let user = null;
        if (typeof supabase.auth.getSession === "function") {
          const { data } = await supabase.auth.getSession();
          user = data?.session?.user || null;
        } else if (typeof supabase.auth.user === "function") {
          user = supabase.auth.user(); // v1
        } else if (typeof supabase.auth.getUser === "function") {
          const { data } = await supabase.auth.getUser(); // v2 also has getUser()
          user = data?.user || null;
        }

        if (user) {
          try {
            await upsertProfile(user);
          } catch (e) {
            // Don't block sign-in on profile write; log and continue
            // eslint-disable-next-line no-console
            console.warn("Profile upsert failed:", e?.message || e);
          }
        }

        // 4) Redirect
        setMsg("Signed in. Redirecting…");
        // Try Next.js navigation first
        router.replace(next);
        // Hard fallback if Next Router fails to navigate (safety net)
        setTimeout(() => {
          if (!active) return;
          if (window.location.pathname !== next) {
            window.location.replace(next);
          }
        }, 800);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Auth callback error:", e);
        setErr(e?.message || "Could not complete sign-in.");
        setMsg("");
      }
    })();

    return () => {
      active = false;
    };
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

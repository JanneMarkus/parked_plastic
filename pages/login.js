// pages/login.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

function sanitizeRedirectPath(raw) {
  if (typeof raw !== "string") return "/";
  // Disallow protocol/host and scheme-relative URLs to prevent open-redirects.
  if (raw.startsWith("//")) return "/";
  if (/^[a-zA-Z]+:\/\//.test(raw)) return "/";
  return raw.startsWith("/") ? raw : "/";
}

export default function Login() {
  const router = useRouter();
  const rawRedirect = typeof router.query.redirect === "string" ? router.query.redirect : "/";
  const nextPath = useMemo(() => sanitizeRedirectPath(rawRedirect), [rawRedirect]);

  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signedInUser, setSignedInUser] = useState(null);

  // Resolve session quickly (works after OAuth redirect and on normal loads)
  useEffect(() => {
    let active = true;

    // 1) Grab current session (fast, no network if cached)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSignedInUser(data?.session?.user ?? null);
        setChecking(false);
      })
      .catch(() => {
        if (active) setChecking(false);
      });

    // 2) Also listen for SIGNED_IN after OAuth exchange
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSignedInUser(session?.user ?? null);
      setChecking(false);
    });

    // 3) Last-ditch safety: never show spinner forever
    const t = setTimeout(() => {
      if (active) setChecking(false);
    }, 4000);

    return () => {
      active = false;
      clearTimeout(t);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async (forceAccountSelection = false) => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : undefined;

      const redirectTo =
        origin != null
          ? `${origin}/login?redirect=${encodeURIComponent(nextPath)}`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: forceAccountSelection ? { prompt: "select_account" } : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      setErrorMsg(e?.message || "Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  };

  const signInDifferent = async () => {
    try {
      await supabase.auth.signOut(); // clear current Supabase session
    } catch {}
    // Force Google's account chooser
    await signInWithGoogle(true);
  };

  return (
    <main className="wrap">
      <Head>
        <title>Sign in — Parked Plastic</title>
        <meta name="description" content="Sign in to Parked Plastic using your Google account." />
        <meta name="robots" content="noindex" />
      </Head>

      <style jsx>{styles}</style>

      <div className="card" role="region" aria-labelledby="login-title">
        <h1 id="login-title">Sign in to Parked Plastic</h1>
        <p className="lead">
          Use Google to continue. You’ll be redirected back to <code className="pill">{nextPath}</code>.
        </p>

        {/* Status */}
        <div aria-live="polite" aria-atomic="true" className="status">
          {checking && <div className="info">Checking your session…</div>}
          {errorMsg && <div className="error">{errorMsg}</div>}
        </div>

        {signedInUser ? (
          <>
            <div style={{ textAlign: "center", color: "var(--char)", margin: "0 0 12px" }}>
              You’re signed in as <strong>{signedInUser.email || "your account"}</strong>.
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => router.replace(nextPath)}
                disabled={checking}
              >
                Continue to {nextPath}
              </button>
              <button
                className="btn btn-outline"
                onClick={signInDifferent}
                disabled={submitting || checking}
                aria-busy={submitting}
              >
                Use a different Google account
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary"
              onClick={() => signInWithGoogle(true)} // force chooser on first-time too
              disabled={submitting || checking}
              aria-busy={submitting}
            >
              <span className="gBadge" aria-hidden>
                G
              </span>
              {submitting ? "Redirecting…" : "Sign in with Google"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

/* ---- Styled-JSX: brand tokens + mobile-first ---- */
const styles = `
  :root {
    --storm: #141B4D;   /* Primary Dark */
    --teal: #279989;    /* Primary Accent */
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;     /* Background */
    --char: #3A3A3A;    /* Neutral Text */
    --cloud: #E9E9E9;   /* Borders */
    --tint: #ECF6F4;    /* Focus glow */
  }

  .wrap { max-width: 480px; margin: 48px auto 90px; padding: 0 12px; background: var(--sea); }

  .card {
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 14px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    padding: 22px;
  }

  h1 {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    letter-spacing: .5px;
    color: var(--storm);
    margin: 0 0 8px;
    font-size: 1.6rem;
  }

  .lead { color: var(--char); margin: 0 0 14px; }
  .pill {
    display: inline-block;
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 999px;
    padding: 2px 8px;
    font-size: .9rem;
  }

  .status { min-height: 24px; margin-bottom: 10px; }
  .info, .error {
    border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0 0;
  }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }

  .btn {
    width: 100%;
    border: none; border-radius: 10px; padding: 12px 16px;
    font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    gap: 10px; font-size: 15px;
  }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-primary[disabled] { opacity: .8; cursor: default; }

  .btn-outline {
    background: transparent;
    border: 2px solid var(--teal);
    color: var(--teal);
  }
  .btn-outline:hover { background: var(--teal); color: #fff; }

  .gBadge {
    background: #fff;
    color: var(--teal);
    border-radius: 6px;
    padding: 6px 8px;
    font-weight: 800;
    line-height: 1;
  }

  .hint {
    font-size: 12px; color: #555; margin-top: 12px;
  }

  @media (min-width: 768px) {
    h1 { font-size: 1.8rem; }
    .wrap { padding: 0 16px; }
  }
`;

// pages/login.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/* --------------------------- Shared small helpers -------------------------- */
const supabase = getSupabaseBrowser();

function sanitizeRedirectPath(raw) {
  if (typeof raw !== "string") return "/";
  if (raw.startsWith("//")) return "/";
  if (/^[a-zA-Z]+:\/\//.test(raw)) return "/";
  return raw.startsWith("/") ? raw : "/";
}

const isValidEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

/* --------------------------- Server-side redirect -------------------------- */
export async function getServerSideProps(ctx) {
  const serverSupabase = createSupabaseServerClient({
    req: ctx.req,
    res: ctx.res,
  });
  // Read & sanitize the redirect target on the server
  const raw =
    typeof ctx.query?.redirect === "string" ? ctx.query.redirect : "/";
  const nextPath = sanitizeRedirectPath(raw);

  // If already signed in, bounce to target immediately
  const { data } = await serverSupabase.auth.getUser();
  if (data?.user) {
    return {
      redirect: { destination: nextPath, permanent: false },
    };
  }

  return {
    props: {
      initialRedirect: nextPath,
    },
  };
}

/* ---------------------------------- Page ---------------------------------- */
export default function Login({ initialRedirect = "/" }) {
  const router = useRouter();
  const rawRedirect =
    typeof router.query.redirect === "string"
      ? router.query.redirect
      : initialRedirect;
  const nextPath = useMemo(
    () => sanitizeRedirectPath(rawRedirect),
    [rawRedirect]
  );

  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signedInUser, setSignedInUser] = useState(null);

  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // For “resend confirmation”
  const [resending, setResending] = useState(false);
  const [canResendConfirm, setCanResendConfirm] = useState(false);

  // Escape hatch for stale/broken sessions
  async function hardResetSession(redirectPath = null) {
    try {
      // clear client state + local storage
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      // clear httpOnly cookies (server-side) if you added the API route
      await fetch("/api/auth/clear", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } finally {
      const dest =
        redirectPath ??
        (typeof window !== "undefined"
          ? `/login?redirect=${encodeURIComponent(nextPath)}`
          : "/login");
      if (typeof window !== "undefined") window.location.replace(dest);
    }
  }

  // Lightweight “already signed in?” client check (SSR already redirected most cases)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!active) return;
        setSignedInUser(data?.user ?? null);
      } catch {
        // show login UI
      } finally {
        if (active) setChecking(false);
      }
    })();

    // keep UI in sync if auth state changes in another tab
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const canSubmit = useMemo(() => {
    const eOk = isValidEmail(email);
    if (mode === "forgot") return eOk && !submitting && !checking;
    if (mode === "signup" || mode === "signin") {
      const pOk = String(password || "").trim().length >= 6;
      return eOk && pOk && !submitting && !checking;
    }
    return false;
  }, [mode, email, password, submitting, checking]);

  async function resendConfirmation(targetEmail) {
    setResending(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const clean = String(targetEmail || email).trim();
      if (!isValidEmail(clean))
        throw new Error("Enter a valid email to resend.");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: clean,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" && window.location?.origin
              ? `${window.location.origin}/login?redirect=${encodeURIComponent(
                  nextPath
                )}`
              : undefined,
        },
      });
      if (error) throw error;
      setInfoMsg("Confirmation email re-sent. Check your inbox.");
      setCanResendConfirm(false);
    } catch (e) {
      const raw = String(e?.message || "");
      // If auth layer is corrupted, let the user nuke cookies
      if (/token|jwt|refresh|expired|auth/i.test(raw)) {
        await hardResetSession();
        return;
      }
      setErrorMsg(e?.message || "Couldn’t resend confirmation.");
    } finally {
      setResending(false);
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setCanResendConfirm(false);
    setSubmitting(true);

    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL;

      const cleanEmail = String(email).trim();
      const cleanPassword = String(password).trim();

      if (mode === "signin") {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Sign-in failed");

        // Hard navigation so the new httpOnly cookies are applied from first paint
        if (typeof window !== "undefined") {
          window.location.assign(nextPath); // or window.location.replace(nextPath)
        }
        return;
      }

      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            // So magic link returns to login with intended redirect
            redirectTo:
              origin != null
                ? `${origin}/login?redirect=${encodeURIComponent(nextPath)}`
                : undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Sign-up failed");

        // If your Supabase project auto-signs in after signup (no email confirmation),
        // the handler will return a session. In that case, hard navigate.
        if (json.hasSession) {
          if (typeof window !== "undefined") {
            window.location.assign(nextPath); // or replace()
          }
          return; // stop here
        }

        // Otherwise, confirmation is required: stay on page and inform the user.
        setInfoMsg(
          "Check your inbox to confirm your account. After verification, come back here to sign in."
        );
        setMode("signin");
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: origin != null ? `${origin}/reset-password` : undefined,
          }
        );
        if (error) throw error;
        setInfoMsg(
          "If that email exists, a password reset link has been sent."
        );
        setMode("signin");
        return;
      }
    } catch (e) {
      const raw = String(e?.message || "");
      let msg = raw || "Something went wrong. Please try again.";
      if (/Invalid login credentials/i.test(raw))
        msg = "Incorrect email or password.";
      if (/Email not confirmed/i.test(raw)) {
        msg = "Please confirm your email before signing in.";
        setCanResendConfirm(true);
      }
      if (/already registered/i.test(raw)) {
        msg =
          "That email is already registered. Try signing in or reset your password.";
        setMode("signin");
      }
      // If we hit token/cookie corruption, give the nuclear option
      if (/token|jwt|refresh|expired|auth/i.test(raw)) {
        await hardResetSession();
        return;
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
      await fetch("/api/auth/clear", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      setSignedInUser(null);
    } catch {}
  };

  return (
    <main className="wrap">
      <Head>
        <title>{`${
          mode === "signup"
            ? "Create account"
            : mode === "forgot"
            ? "Reset password"
            : "Sign in"
        } — Parked Plastic`}</title>
        <meta
          name="description"
          content="Sign in or create an account on Parked Plastic with your email and password."
        />
        <meta name="robots" content="noindex" />
      </Head>

      <style jsx>{styles}</style>

      <div className="card" role="region" aria-labelledby="login-title">
        <h1 id="login-title">
          {mode === "signup"
            ? "Create your account"
            : mode === "forgot"
            ? "Reset your password"
            : "Sign in to Parked Plastic"}
        </h1>

        <p className="lead">
          You’ll return to <code className="pill">{nextPath}</code> after
          authentication.
        </p>

        {/* Status */}
        <div aria-live="polite" aria-atomic="true" className="status">
          {checking && <div className="info">Checking your session…</div>}
          {infoMsg && <div className="info">{infoMsg}</div>}
          {errorMsg && <div className="error">{errorMsg}</div>}
        </div>

        {signedInUser ? (
          <>
            <div
              style={{
                textAlign: "center",
                color: "var(--char)",
                margin: "0 0 12px",
              }}
            >
              You’re signed in as{" "}
              <strong>{signedInUser.email || "your account"}</strong>.
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
                onClick={signOut}
                disabled={submitting || checking}
                aria-busy={submitting}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} className="form">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="email-help"
              />

              {mode !== "forgot" && (
                <>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="input"
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                  />
                </>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={!canSubmit}
                aria-busy={submitting}
              >
                {mode === "signup"
                  ? submitting
                    ? "Creating…"
                    : "Create account"
                  : mode === "forgot"
                  ? submitting
                    ? "Sending…"
                    : "Send reset link"
                  : submitting
                  ? "Signing in…"
                  : "Sign in"}
              </button>
            </form>

            {/* Contextual helper: resend confirmation */}
            {canResendConfirm && (
              <div className="resendRow">
                <button
                  className="linklike"
                  onClick={() => resendConfirmation(email)}
                  disabled={resending}
                >
                  {resending ? "Resending…" : "Resend confirmation email"}
                </button>
              </div>
            )}

            {/* Mode Switches */}
            <div
              className="switches"
              role="navigation"
              aria-label="auth options"
            >
              {mode !== "signin" && (
                <button
                  className="linklike"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg("");
                    setInfoMsg("");
                    setCanResendConfirm(false);
                  }}
                >
                  Have an account? Sign in
                </button>
              )}
              {mode !== "signup" && (
                <button
                  className="linklike"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                    setInfoMsg("");
                    setCanResendConfirm(false);
                  }}
                >
                  New here? Create an account
                </button>
              )}
              {mode !== "forgot" && (
                <button
                  className="linklike"
                  onClick={() => {
                    setMode("forgot");
                    setErrorMsg("");
                    setInfoMsg("");
                    setCanResendConfirm(false);
                  }}
                >
                  Forgot your password?
                </button>
              )}
            </div>
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

  .wrap { max-width: 520px; margin: 48px auto 90px; padding: 0 12px; background: var(--sea); }

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

  .troubleRow { margin-top: 8px; text-align: center; }

  /* Prevent 100%-width inputs from spilling past the card */
  .form { display: grid; gap: 10px; margin-top: 8px; min-width: 0; }
  .input, .btn {
    box-sizing: border-box;
    max-width: 100%;
  }

  .form { display: grid; gap: 10px; margin-top: 8px; }

  .label { font-weight: 600; color: var(--storm); }
  .input {
    width: 100%;
    background: #fff;
    border: 1px solid var(--cloud);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 15px;
  }
  .input:focus {
    outline: none;
    border-color: var(--teal);
    box-shadow: 0 0 0 4px var(--tint);
  }

  .btn {
    width: 100%;
    box-sizing: border-box;
    max-width: 100%;
    border: none; border-radius: 10px; padding: 12px 16px;
    font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    gap: 10px; font-size: 15px;
  }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-primary[disabled] { opacity: .8; cursor: default; }

  .switches {
    display: grid;
    gap: 8px;
    margin-top: 14px;
    text-align: center;
  }
  .linklike {
    appearance: none;
    background: transparent;
    border: none;
    padding: 2px 4px;
    color: var(--teal);
    text-decoration: underline;
    cursor: pointer;
    font-weight: 600;
  }

  .resendRow {
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }

  .hint { font-size: 12px; color: #555; }

  @media (min-width: 768px) {
    h1 { font-size: 1.8rem; }
    .wrap { padding: 0 16px; }
  }
`;

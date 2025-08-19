// pages/reset-password.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setHasSession(!!data?.session);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfoMsg("Password updated. Redirecting to sign in…");
      setTimeout(() => router.replace("/login"), 900);
    } catch (e) {
      setErrorMsg(e?.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="wrap">
      <Head>
        <title>Reset your password — Parked Plastic</title>
        <meta name="robots" content="noindex" />
      </Head>

      <style jsx>{styles}</style>

      <div className="card" role="region" aria-labelledby="reset-title">
        <h1 id="reset-title">Reset your password</h1>

        <div className="status" aria-live="polite" aria-atomic="true">
          {checking && <div className="info">Checking your reset link…</div>}
          {!checking && !hasSession && (
            <div className="error">
              Your reset link is missing or expired. Go back to{" "}
              <a href="/login" className="alink">Sign in</a> and choose “Forgot your password?” to get a new link.
            </div>
          )}
          {errorMsg && <div className="error">{errorMsg}</div>}
          {infoMsg && <div className="info">{infoMsg}</div>}
        </div>

        {hasSession && (
          <form onSubmit={onSubmit} className="form">
            <label className="label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

/* ---- Styled-JSX: brand tokens + mobile-first ---- */
const styles = `
  :root {
    --storm: #141B4D;
    --teal: #279989;
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;
    --char: #3A3A3A;
    --cloud: #E9E9E9;
    --tint: #ECF6F4;
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

  .status { min-height: 24px; margin-bottom: 10px; }
  .info, .error {
    border-radius: 10px; padding: 10px 12px; font-size: .95rem; margin: 8px 0 0;
  }
  .info { background: #f4fff9; border: 1px solid #d1f5e5; color: #1a6a58; }
  .error { background: #fff5f4; border: 1px solid #ffd9d5; color: #8c2f28; }

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
    border: none; border-radius: 10px; padding: 12px 16px;
    font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    gap: 10px; font-size: 15px;
  }
  .btn:focus { outline: none; box-shadow: 0 0 0 4px var(--tint); }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { background: var(--teal-dark); }
  .btn-primary[disabled] { opacity: .8; cursor: default; }

  .alink { color: var(--teal); text-decoration: underline; }
  @media (min-width: 768px) {
    h1 { font-size: 1.8rem; }
    .wrap { padding: 0 16px; }
  }
`;

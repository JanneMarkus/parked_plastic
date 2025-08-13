// pages/500.js
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function InternalErrorPage() {
  const router = useRouter();
  const [reloading, setReloading] = useState(false);

  const handleRetry = async () => {
    setReloading(true);
    try {
      // Soft reload the current route
      await router.replace(router.asPath);
    } finally {
      setReloading(false);
    }
  };

  return (
    <main className="wrap" role="main" aria-labelledby="err-title">
      <Head>
        <title>Something went wrong — Parked Plastic</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content="An unexpected error occurred." />
      </Head>

      <style jsx>{styles}</style>

      <section className="card">
        <h1 id="err-title">500 — We shanked that one</h1>
        <p className="lead">
          Sorry, something went wrong on our end. Try again, or head back to browse listings.
        </p>

        <div className="actions">
          <button className="btn btn-primary" onClick={handleRetry} disabled={reloading} aria-busy={reloading}>
            {reloading ? "Trying again…" : "Try again"}
          </button>
          <Link href="/" className="btn btn-outline" aria-label="Go to Home">
            Back to Home
          </Link>
          <Link href="/account" className="btn btn-outline" aria-label="My Listings">
            My Listings
          </Link>
        </div>
      </section>
    </main>
  );
}

/* Styled-JSX: brand tokens (self-contained) */
const styles = `
  :root {
    --storm:#141B4D; --teal:#279989; --teal-dark:#1E7A6F;
    --sea:#F8F7EC; --char:#3A3A3A; --cloud:#E9E9E9; --tint:#ECF6F4;
  }

  .wrap { max-width: 800px; margin: 48px auto 100px; padding: 0 12px; background: var(--sea); }

  .card {
    background:#fff; border:1px solid var(--cloud); border-radius:14px;
    box-shadow:0 4px 10px rgba(0,0,0,0.05); padding:24px; text-align:center;
  }

  h1 {
    font-family:'Poppins',sans-serif; font-weight:600; letter-spacing:.5px;
    color:var(--storm); margin:0 0 8px; font-size:1.8rem;
  }
  .lead { color:var(--char); margin:0 0 16px; }

  .actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:8px; }

  .btn {
    border:none; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer;
    text-decoration:none; display:inline-flex; align-items:center; justify-content:center;
  }
  .btn:focus { outline:none; box-shadow:0 0 0 4px var(--tint); }
  .btn-primary { background:var(--teal); color:#fff; }
  .btn-primary:hover { background:var(--teal-dark); }
  .btn-outline { background:#fff; color:var(--storm); border:2px solid var(--storm); }
  .btn-outline:hover { background:var(--storm); color:#fff; }

  @media (min-width:768px) {
    .wrap { padding: 0 16px; }
    h1 { font-size: 2rem; }
  }
`;

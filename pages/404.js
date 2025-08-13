// pages/404.js
import Head from "next/head";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="wrap" role="main" aria-labelledby="nf-title">
      <Head>
        <title>Page not found — Parked Plastic</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content="The page you’re looking for doesn’t exist." />
      </Head>

      <style jsx>{styles}</style>

      <section className="card">
        <h1 id="nf-title">404 — This fairway’s out of bounds</h1>
        <p className="lead">
          The page you’re looking for doesn’t exist. It might’ve been moved or the URL has a typo.
        </p>

        <div className="actions">
          <Link href="/" className="btn btn-primary" aria-label="Go to Home">
            Back to Home
          </Link>
          <Link href="/create-listing" className="btn btn-outline" aria-label="Post a Disc">
            Post a Disc
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

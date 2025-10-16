import Link from "next/link";

export default function Footer() {
  return (
    <footer className="siteFooter" role="contentinfo">
      <div className="inner">
        <nav aria-label="Footer">
          <ul className="links">
            <li>
              <Link href="/about">About Parked Plastic</Link>
            </li>
            <li>
              <Link href="/report-bug">Report a bug</Link>
            </li>
            <li>
              <Link href="/account">My Account</Link>
            </li>
          </ul>
        </nav>
        <div className="copy">&copy; {new Date().getFullYear()} Parked Plastic</div>
      </div>

      <style jsx>{`
        .siteFooter {
          margin-top: 40px;
          padding: 24px 16px;
          border-top: 1px solid var(--cloud);
          background: #fff;
          color: var(--char);
        }
        .inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 14px 18px;
        }
        .links a {
          color: var(--storm);
          text-decoration: none;
          font-weight: 600;
        }
        .links a:hover { text-decoration: underline; }
        .copy { font-size: 13px; opacity: 0.8; }
        @media (min-width: 768px) {
          .inner { flex-direction: row; align-items: center; justify-content: space-between; }
        }
      `}</style>
    </footer>
  );
}


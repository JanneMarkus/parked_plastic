// components/ContactSeller.js
"use client";

import React, { useMemo } from "react";
import { MessageSquareText, Mail, ExternalLink, Copy } from "lucide-react";

/**
 * ContactSeller (Messenger primary, no Call button)
 *
 * Props:
 * - listingTitle: string
 * - listingUrl: string (absolute URL)
 * - seller: { email?: string; phone?: string; messenger?: string }
 * - allowSMS?: boolean (default true)
 * - showCopy?: boolean (default true)
 * - size?: "sm" | "md" | "lg" (default "md")
 */
export default function ContactSeller({
  listingTitle,
  listingUrl,
  seller,
  allowSMS = true,
  showCopy = true,
  size = "md",
}) {
  const msg = useMemo(() => {
    const text = `Hi! I'm interested in your listing: ${listingTitle} — ${listingUrl}`;
    return encodeURIComponent(text);
  }, [listingTitle, listingUrl]);

  const sizeClass =
    size === "sm" ? "sm" : size === "lg" ? "lg" : "md"; // default md

  const messengerHandle = (seller?.messenger || "").replace(/^@+/, "").trim();
  const phone = (seller?.phone || "").trim();
  const email = (seller?.email || "").trim();

  const actions = [
    // 1) Messenger (primary)
    messengerHandle && {
      key: "messenger",
      label: "Messenger",
      href: `https://m.me/${encodeURIComponent(messengerHandle)}`,
      icon: <ExternalLink className="icon" />,
      primary: true,
      target: "_blank",
      rel: "noopener noreferrer",
    },

    // 2) Text/SMS (secondary)
    allowSMS && phone && {
      key: "sms",
      label: "Text",
      href: `sms:${encodeURIComponent(phone)}?&body=${msg}`,
      icon: <MessageSquareText className="icon" />,
    },

    // 3) Email (secondary)
    email && {
      key: "email",
      label: "Email",
      href: `mailto:${encodeURIComponent(
        email
      )}?subject=${encodeURIComponent(
        `Interested in: ${listingTitle}`
      )}&body=${msg}`,
      icon: <Mail className="icon" />,
    },
  ].filter(Boolean);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(`${listingTitle} — ${listingUrl}`);
      alert("Listing link copied!");
    } catch {
      alert("Couldn't copy. Long-press or right-click to copy the link.");
    }
  }

  return (
    <section className="card" aria-label="Contact seller">
      <style jsx>{styles}</style>

      <div className="head">
        <h3>Contact Seller</h3>
        {showCopy && (
          <button
            type="button"
            className={`btn btn-outline sm`}
            onClick={copyToClipboard}
            aria-label="Copy listing link"
          >
            <Copy className="icon-sm" />
            Copy listing link
          </button>
        )}
      </div>

      {actions.length === 0 ? (
        <p className="muted">
          The seller hasn’t added any contact details yet.
        </p>
      ) : (
        <div className="grid">
          {actions.map((a) => (
            <a
              key={a.key}
              href={a.href}
              target={a.target}
              rel={a.rel}
              className={`btn ${a.primary ? "btn-primary" : "btn-outline"} ${sizeClass}`}
            >
              {a.icon}
              <span>{a.label}</span>
            </a>
          ))}
        </div>
      )}

      <p className="tip">
        Tip: On mobile, these open your apps directly. On desktop, they open
        your default handlers.
      </p>
    </section>
  );
}

const styles = `
  :root {
    --storm:#141B4D; --teal:#279989; --teal-dark:#1E7A6F;
    --sea:#F8F7EC; --wave:#D6D2C4; --char:#3A3A3A; --cloud:#E9E9E9; --tint:#ECF6F4;
  }

  .card {
    background:#fff; border:1px solid var(--cloud); border-radius:14px;
    box-shadow:0 4px 10px rgba(0,0,0,0.05); padding:18px;
  }

  .head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
  h3 { margin:0; font-family:'Poppins',sans-serif; font-weight:600; color:var(--storm); letter-spacing:.5px; }

  .muted { color:#666; }
  .tip { margin-top:10px; color:var(--char); font-size:.9rem; }

  .grid {
    display:grid; grid-template-columns:1fr; gap:10px;
  }
  @media (min-width:640px){ .grid { grid-template-columns:1fr 1fr; } }
  @media (min-width:1024px){ .grid { grid-template-columns:1fr 1fr 1fr; } }

  .btn {
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    border-radius:10px; font-weight:700; text-decoration:none; cursor:pointer;
    padding:10px 14px; border:2px solid transparent; transition:background .15s, color .15s, border-color .15s, box-shadow .15s;
  }
  .btn:focus { outline:none; box-shadow:0 0 0 4px var(--tint); }

  .btn-primary { background:var(--teal); color:#fff; }
  .btn-primary:hover { background:var(--teal-dark); }

  .btn-outline { background:#fff; color:var(--storm); border-color:var(--storm); }
  .btn-outline:hover { background:var(--storm); color:#fff; }

  .sm { padding:8px 12px; font-size:.9rem; }
  .md { padding:10px 14px; }
  .lg { padding:12px 16px; font-size:1.05rem; }

  .icon { width:20px; height:20px; }
  .icon-sm { width:16px; height:16px; }
`;

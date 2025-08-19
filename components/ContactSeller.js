// components/ContactSeller.js
import React from "react";
import { MessageSquareText, Mail, Copy, ExternalLink, Info } from "lucide-react";

function encodeMessage(title, url) {
  const msg = `Hi! I'm interested in your listing: ${title} — ${url}`;
  return encodeURIComponent(msg);
}

function cleanMessenger(handle = "") {
  // Accept full URLs or handles; return bare handle for m.me
  let h = String(handle).trim();
  if (!h) return "";
  // strip URL prefix if present
  h = h.replace(/^https?:\/\/(www\.)?m\.me\//i, "");
  h = h.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "");
  // remove @ and whitespace
  h = h.replace(/^@+/, "").replace(/\s+/g, "");
  return h;
}

function cleanPhone(raw = "") {
  // Keep leading +, then digits only
  const s = String(raw).trim();
  if (!s) return "";
  const plus = s.startsWith("+") ? "+" : "";
  const digits = s.replace(/[^\d]/g, "");
  return plus + digits;
}

export default function ContactSeller({
  listingTitle,
  listingUrl,
  seller,
  allowSMS = true,
  showCopy = true,
  size = "md", // "sm" | "md" | "lg"
}) {
  const email = seller?.email || seller?.public_email || "";
  const messenger = cleanMessenger(seller?.messenger || "");
  const phone = cleanPhone(seller?.phone || "");
  const msg = encodeMessage(listingTitle, listingUrl);

  const actions = [
    messenger && {
      key: "messenger",
      label: "Messenger",
      href: `https://m.me/${messenger}`,
      icon: <ExternalLink size={18} aria-hidden />,
      primary: true,
      target: "_blank",
      rel: "noopener noreferrer",
    },
    allowSMS && phone && {
      key: "sms",
      label: "Text",
      href: `sms:${phone}?body=${msg}`,
      icon: <MessageSquareText size={18} aria-hidden />,
      target: undefined,
      rel: undefined,
    },
    email && {
      key: "email",
      label: "Email",
      href: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        `Interested in: ${listingTitle}`
      )}&body=${msg}`,
      icon: <Mail size={18} aria-hidden />,
      target: undefined,
      rel: undefined,
    },
  ].filter(Boolean);

  const sizeClass =
    size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "btn-md";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${listingTitle} — ${listingUrl}`);
      alert("Listing link copied!");
    } catch {
      alert("Couldn't copy. Long-press or right-click to copy the link.");
    }
  };

  return (
    <section className="cs-wrap" aria-label="Contact Seller">
      <style jsx>{`
        .cs-wrap {
          background: var(--sea, #F8F7EC);
          border: 1px solid var(--cloud, #E9E9E9);
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          padding: 16px;
        }
        .cs-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .cs-title {
          margin: 0;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: var(--storm, #141B4D);
        }

        /* Button base */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          user-select: none;
          border: 2px solid var(--storm, #141B4D);
          background: #fff;
          color: var(--storm, #141B4D);
          transition: box-shadow 0.15s, transform 0.08s, background 0.15s, color 0.15s;
        }
        .btn:focus {
          outline: none;
          box-shadow: 0 0 0 4px var(--tint, #ECF6F4);
        }
        .btn:hover {
          background: var(--storm, #141B4D);
          color: #fff;
        }
        .btn-sm { padding: 8px 10px; font-size: 0.9rem; }
        .btn-md { padding: 10px 14px; font-size: 1rem; }
        .btn-lg { padding: 12px 16px; font-size: 1.1rem; }

        /* Primary style (Messenger) */
        .btn.primary {
          background: var(--teal, #279989);
          color: #fff;
          border-color: var(--teal, #279989);
        }
        .btn.primary:hover {
          background: var(--teal-dark, #1E7A6F);
          border-color: var(--teal-dark, #1E7A6F);
          color: #fff;
        }

        /* Actions layout */
        .cs-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .cs-tip {
          margin-top: 10px;
          color: var(--char, #3A3A3A);
          font-size: 0.9rem;
        }

        .empty {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fffdf5;
          border: 1px solid #ffe7b3;
          color: #7a5b00;
          font-size: 0.95rem;
        }
      `}</style>

      <div className="cs-head">
        <h3 className="cs-title">Contact Seller</h3>
        {showCopy && (
          <button
            type="button"
            className={`btn ${sizeClass}`}
            onClick={copyToClipboard}
            aria-label="Copy listing link"
          >
            <Copy size={16} aria-hidden />
            Copy listing link
          </button>
        )}
      </div>

      {actions.length > 0 ? (
        <>
          <div className="cs-actions">
            {actions.map((a) => (
              <a
                key={a.key}
                href={a.href}
                target={a.target}
                rel={a.rel}
                className={`btn ${a.primary ? "primary" : ""} ${sizeClass}`}
              >
                {a.icon}
                <span>{a.label}</span>
              </a>
            ))}
          </div>
          <p className="cs-tip">
            Tip: On mobile, these open your apps directly. On desktop, they open your
            default handlers.
          </p>
        </>
      ) : (
        <div className="empty" role="note" aria-live="polite">
          <Info size={16} aria-hidden />
          The seller hasn’t added contact info yet.
        </div>
      )}
    </section>
  );
}

// components/ContactSeller.js
import React, { useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  Mail,
  Copy,
  ExternalLink,
  Info,
  Eye,
} from "lucide-react";

function encodeMessage(title, url) {
  const msg = `Hi! I'm interested in your listing: ${title} — ${url}`;
  return encodeURIComponent(msg);
}
function cleanMessenger(handle = "") {
  let h = String(handle).trim();
  if (!h) return "";
  h = h.replace(/^https?:\/\/(www\.)?m\.me\//i, "");
  h = h.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "");
  h = h.replace(/^@+/, "").replace(/\s+/g, "");
  return h;
}
function cleanPhone(raw = "") {
  const s = String(raw).trim();
  if (!s) return "";
  const plus = s.startsWith("+") ? "+" : "";
  const digits = s.replace(/[^\d]/g, "");
  return plus + digits;
}

export default function ContactSeller({
  listingId, // required
  listingTitle,
  listingUrl,
  allowSMS = true,
  showCopy = true,
  size = "md",
}) {
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState(null); // { public_email, phone, messenger }
  const [hasContact, setHasContact] = useState(undefined); // <- NEW: boolean | undefined
  const [peeking, setPeeking] = useState(true);

  const msg = encodeMessage(listingTitle, listingUrl);
  const sizeClass =
    size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "btn-md";

  // ---- Peek on mount (boolean only, safe) ----
  useEffect(() => {
    let cancelled = false;
    if (!listingId) return;
    (async () => {
      try {
        setPeeking(true);
        const res = await fetch(
          `/api/reveal-contact?listingId=${encodeURIComponent(listingId)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to check contact.");
        if (!cancelled) setHasContact(Boolean(json.hasContact));
      } catch (e) {
        if (!cancelled) setHasContact(undefined); // fail open: show Reveal button
      } finally {
        if (!cancelled) setPeeking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  // Build actions only AFTER we have contact
  const actions = useMemo(() => {
    if (!contact) return [];
    const email = contact?.public_email || "";
    const messenger = cleanMessenger(contact?.messenger || "");
    const phone = cleanPhone(contact?.phone || "");
    const emailHref = email
      ? `mailto:${email}` +
        `?subject=${encodeURIComponent(`Interested in: ${listingTitle}`)}` +
        `&body=${encodeURIComponent(
          `Hi! I'm interested in your listing: ${listingTitle} — ${listingUrl}`
        )}`
      : "";
    return [
      messenger && {
        key: "messenger",
        label: "Messenger",
        icon: <ExternalLink size={18} aria-hidden />,
        onClick: () =>
          window.open(
            `https://m.me/${messenger}`,
            "_blank",
            "noopener,noreferrer"
          ),
        primary: true,
      },
      allowSMS &&
        phone && {
          key: "sms",
          label: "Text",
          icon: <MessageSquareText size={18} aria-hidden />,
          onClick: () => (window.location.href = `sms:${phone}?body=${msg}`),
        },
      email && {
        key: "email",
        label: "Email",
        icon: <Mail size={18} aria-hidden />,
        href: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          `Interested in: ${listingTitle}`
        )}&body=${msg}`,
        isLink: true,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ].filter(Boolean);
  }, [contact, allowSMS, listingTitle, msg]);

  async function onReveal() {
    try {
      setError("");
      setRevealing(true);
      const res = await fetch("/api/reveal-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to reveal contact.");
      setContact(json.contact || {});
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setRevealing(false);
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${listingUrl}`);
      alert("Listing link copied!");
    } catch {
      alert("Couldn't copy. Long-press or right-click to copy the link.");
    }
  };

  return (
    <section className="cs-wrap" aria-label="Contact Seller">
      <style jsx>{`
        .cs-wrap {
          background: var(--sea, #f8f7ec);
          border: 1px solid var(--cloud, #e9e9e9);
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
          font-family: "Poppins", sans-serif;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: var(--storm, #141b4d);
        }

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
          border: 2px solid var(--storm, #141b4d);
          background: #fff;
          color: var(--storm, #141b4d);
          transition: box-shadow 0.15s, transform 0.08s, background 0.15s,
            color 0.15s;
        }
        .btn:focus {
          outline: none;
          box-shadow: 0 0 0 4px var(--tint, #ecf6f4);
        }
        .btn:hover {
          background: var(--storm, #141b4d);
          color: #fff;
        }
        .btn-sm {
          padding: 8px 10px;
          font-size: 0.9rem;
        }
        .btn-md {
          padding: 10px 14px;
          font-size: 1rem;
        }
        .btn-lg {
          padding: 12px 16px;
          font-size: 1.1rem;
        }
        .btn.primary {
          background: var(--teal, #279989);
          color: #fff;
          border-color: var(--teal, #279989);
        }
        .btn.primary:hover {
          background: var(--teal-dark, #1e7a6f);
          border-color: var(--teal-dark, #1e7a6f);
          color: #fff;
        }

        .cs-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .cs-tip {
          margin-top: 10px;
          color: var(--char, #3a3a3a);
          font-size: 0.9rem;
        }

        .empty,
        .errorMsg {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.95rem;
        }
        .empty {
          background: #fffdf5;
          border: 1px solid #ffe7b3;
          color: #7a5b00;
        }
        .errorMsg {
          background: #fff5f4;
          border: 1px solid #ffd9d5;
          color: #8c2f28;
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

      {/* If we already know there is no contact, show it immediately */}
      {hasContact === false && !contact ? (
        <div className="empty" role="note" aria-live="polite">
          <Info size={16} aria-hidden />
          The seller hasn’t added public contact info yet. But you can copy the
          listing link and contact them directly.
        </div>
      ) : !contact ? (
        <>
          {error && (
            <div className="errorMsg" role="alert">
              <Info size={16} aria-hidden />
              {error}
            </div>
          )}
          <div className="cs-actions">
            <button
              type="button"
              className={`btn ${sizeClass}`}
              onClick={onReveal}
              disabled={revealing || !listingId || peeking} // disable while peeking
              aria-busy={revealing ? "true" : "false"}
              title={peeking ? "Checking seller’s contact…" : undefined}
            >
              <Eye size={18} aria-hidden />
              {revealing ? "Revealing…" : "Reveal contact options"}
            </button>
          </div>
          <p className="cs-tip">
            We protect sellers by revealing contact details on demand.
          </p>
        </>
      ) : (
        // After reveal
        <>
          {actions.length > 0 ? (
            <>
              <div className="cs-actions">
                {actions.map((a) =>
                  a.isLink ? (
                    <a
                      key={a.key}
                      href={a.href}
                      target="_blank"
                      className={`btn ${
                        a.primary ? "primary" : ""
                      } ${sizeClass}`}
                    >
                      {a.icon}
                      <span>{a.label}</span>
                    </a>
                  ) : (
                    <button
                      key={a.key}
                      type="button"
                      onClick={a.onClick}
                      className={`btn ${
                        a.primary ? "primary" : ""
                      } ${sizeClass}`}
                    >
                      {a.icon}
                      <span>{a.label}</span>
                    </button>
                  )
                )}
              </div>
              <p className="cs-tip">
                Tip: On mobile these open your apps; on desktop they use your
                default handlers.
              </p>
            </>
          ) : (
            <div className="empty" role="note" aria-live="polite">
              <Info size={16} aria-hidden />
              The seller hasn’t added public contact info yet. But you can copy
              the listing link and contact them directly.
            </div>
          )}
        </>
      )}
    </section>
  );
}

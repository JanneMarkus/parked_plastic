// components/ContactInfoCard.js
"use client";

import { useEffect, useMemo, useState } from "react";

export default function ContactInfoCard({ userId }) {
  const [initial, setInitial] = useState({ public_email: "", phone: "", messenger: "" });
  const [form, setForm] = useState({ public_email: "", phone: "", messenger: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const dirty = useMemo(
    () =>
      form.public_email !== initial.public_email ||
      form.phone !== initial.phone ||
      form.messenger !== initial.messenger,
    [form, initial]
  );

  function redirectToLogin() {
    const redirect =
      typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : "/account";
    window.location.replace(`/login?redirect=${redirect}`);
  }

  useEffect(() => {
    let active = true;

    (async () => {
      // If no userId (shouldn’t happen on SSR-gated pages), reset and stop.
      if (!userId) {
        if (active) {
          setInitial({ public_email: "", phone: "", messenger: "" });
          setForm({ public_email: "", phone: "", messenger: "" });
          setLoading(false);
          setMsg({ kind: "", text: "" });
        }
        return;
      }

      setLoading(true);
      setMsg({ kind: "", text: "" });

      try {
        const res = await fetch("/api/profile/get", {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" },
        });

        if (res.status === 401) {
          redirectToLogin();
          return;
        }

        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error || "Failed to load contact info.");
        }

        const json = await res.json();
        const data = json?.data || {};
        const base = {
          public_email: data.public_email || "",
          phone: data.phone || "",
          messenger: data.messenger || "",
        };

        if (active) {
          setInitial(base);
          setForm(base);
        }
      } catch (error) {
        if (active) {
          setMsg({ kind: "error", text: error?.message || "Failed to load contact info." });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function validate() {
    if (form.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.public_email)) {
      return "That email doesn’t look valid.";
    }
    if (form.phone && !/^\+?[0-9()\-\s]{7,20}$/.test(form.phone)) {
      return "That phone number doesn’t look valid. Include country code (e.g., +18075551234).";
    }
    if (form.messenger && /[@\s]/.test(form.messenger)) {
      return "Messenger handle should not include spaces or @.";
    }
    return null;
  }

  async function onSave(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setMsg({ kind: "error", text: err });
      return;
    }

    setSaving(true);
    setMsg({ kind: "", text: "" });

    // Prepare payload (use nulls so server can clear fields)
    const payload = {
      public_email: form.public_email.trim() || null,
      phone: form.phone.trim() || null,
      messenger: form.messenger.trim() || null,
    };

    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error || "Failed to save.");
      }

      // Success → sync initial state
      setInitial({
        public_email: payload.public_email || "",
        phone: payload.phone || "",
        messenger: payload.messenger || "",
      });
      setMsg({ kind: "info", text: "Saved!" });
    } catch (e) {
      setMsg({ kind: "error", text: e?.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pp-card pp-card--pad" aria-label="Contact info shown to buyers">
      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>Contact Info</h2>
        <p style={{ color: "var(--char)", opacity: 0.85, margin: 0, fontSize: ".95rem" }}>
          Note: These details will show publicly on your listings behind a "reveal contact options" button.
          Leave blank to hide a channel.
        </p>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading…</p>
      ) : (
        <form onSubmit={onSave}>
          <div className="pp-grid2" style={{ marginBottom: "12px" }}>
            <div className="pp-field">
              <label htmlFor="public_email">Public email</label>
              <input
                id="public_email"
                type="email"
                className="pp-input"
                placeholder="you@example.com"
                value={form.public_email}
                onChange={(e) => setField("public_email", e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="pp-field">
              <label htmlFor="phone">Phone (with country code)</label>
              <input
                id="phone"
                type="tel"
                className="pp-input"
                placeholder="+18075551234"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="pp-field">
              <label htmlFor="messenger">Messenger username</label>
              <input
                id="messenger"
                type="text"
                className="pp-input"
                placeholder="john.doe.discgolf"
                value={form.messenger}
                onChange={(e) => setField("messenger", e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div aria-live="polite" style={{ minHeight: "28px", marginBottom: "8px" }}>
            {msg.text && (
              <div
                className="pp-badge"
                style={{
                  background: msg.kind === "error" ? "#fff5f4" : "#f4fff9",
                  border: msg.kind === "error" ? "1px solid #ffd9d5" : "1px solid #d1f5e5",
                  color: msg.kind === "error" ? "#8c2f28" : "#1a6a58",
                }}
              >
                {msg.text}
              </div>
            )}
          </div>

          <div className="pp-actions">
            <button
              type="submit"
              className="pp-btn pp-btn--primary"
              disabled={!dirty || saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

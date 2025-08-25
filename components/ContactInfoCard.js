// components/ContactInfoCard.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowser();

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

  useEffect(() => {
  let active = true;
  (async () => {
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
      setMsg({ kind: "", text: "" });
      const { data, error } = await supabase
        .from("profiles")
        .select("public_email, phone, messenger")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setMsg({ kind: "error", text: error.message || "Failed to load contact info." });
      } else {
        const base = {
          public_email: data?.public_email || "",
          phone: data?.phone || "",
          messenger: data?.messenger || "",
        };
        setInitial(base);
        setForm(base);
      }
      setLoading(false);
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
    try {
      const payload = {
        public_email: form.public_email.trim() || null,
        phone: form.phone.trim() || null,
        messenger: form.messenger.trim() || null,
      };
      const { error } = await supabase
  .from("profiles")
  .upsert({ id: userId, ...payload }, { onConflict: "id" });
      if (error) throw error;

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
          Note: These details will show publicly on your listings behind a "reveal contact options" button. Leave blank to hide a channel.
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
                  background:
                    msg.kind === "error" ? "#fff5f4" : "#f4fff9",
                  border:
                    msg.kind === "error"
                      ? "1px solid #ffd9d5"
                      : "1px solid #d1f5e5",
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

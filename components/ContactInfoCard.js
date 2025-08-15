// components/ContactInfoCard.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
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
    return () => { active = false; };
  }, [userId]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // relaxed client-side checks to avoid blocking valid data
  function validate() {
    if (form.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.public_email)) {
      return "That email doesn’t look valid.";
    }
    if (form.phone && !/^\+?[0-9()\-\s]{7,20}$/.test(form.phone)) {
      return "That phone number doesn’t look valid. Include country code (e.g., +17055551234).";
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
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
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
    <section className="card" aria-label="Contact info shown to buyers">
      <style jsx>{styles}</style>

      <div className="titleRow">
        <h2>Contact Info</h2>
        <p className="subtle">These details show on your listings. Leave blank to hide a channel.</p>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form onSubmit={onSave}>
          <div className="grid3">
            <div className="field">
              <label htmlFor="public_email">Public email</label>
              <input
                id="public_email"
                type="email"
                placeholder="you@example.com"
                value={form.public_email}
                onChange={(e) => setField("public_email", e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone (with country code)</label>
              <input
                id="phone"
                type="tel"
                placeholder="+17055551234"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="field">
              <label htmlFor="messenger">Messenger username</label>
              <input
                id="messenger"
                type="text"
                placeholder="john.doe.discgolf"
                value={form.messenger}
                onChange={(e) => setField("messenger", e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div aria-live="polite" className="status">
            {msg.text && <div className={`chip ${msg.kind === "error" ? "error" : "info"}`}>{msg.text}</div>}
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

const styles = `
  :root {
    --storm: #141B4D;         /* Primary Dark */
    --teal: #279989;          /* Primary Accent */
    --teal-dark: #1E7A6F;
    --sea: #F8F7EC;           /* Background */
    --wave: #D6D2C4;          /* Secondary BG */
    --char: #3A3A3A;          /* Neutral Text */
    --cloud: #E9E9E9;         /* Borders */
    --tint: #ECF6F4;          /* Accent Tint */
  }

  .card {
    background:#fff;
    border:1px solid var(--cloud);
    border-radius:14px;
    box-shadow:0 4px 10px rgba(0,0,0,0.05);
    padding:18px;
    margin: 12px 0 20px;
  }

  .titleRow {
    display:flex; align-items:baseline; justify-content:space-between;
    gap:12px; margin-bottom:10px;
  }
  h2 {
    margin:0;
    font-family:'Poppins',sans-serif;
    font-weight:600;
    color:var(--storm);
    letter-spacing:.5px;
    font-size:1.25rem;
  }
  .subtle { color: var(--char); opacity:.85; margin:0; font-size:.95rem; }
  .muted { color:#666; }

  /* Grid: mobile-first, then 3-up on md+ */
  .grid3 { display:grid; grid-template-columns:1fr; gap:14px; }
  @media (min-width:768px){ .grid3 { grid-template-columns:1fr 1fr 1fr; gap:16px; } }

  .field label {
    display:block;
    font-family:'Poppins',sans-serif;
    font-weight:600;
    color:var(--storm);
    font-size:.95rem;
    margin-bottom:6px;
  }
  .field input {
    width:100%;
    background:#fff;
    border:1px solid var(--cloud);
    border-radius:10px;
    padding:12px 14px;
    font-size:15px;
    color:var(--char);
    outline:none;
    transition:border-color .15s, box-shadow .15s;
  }
  .field input:focus {
    border-color:var(--teal);
    box-shadow:0 0 0 4px var(--tint);
  }

  .status { min-height:28px; margin-top:6px; }
  .chip {
    display:inline-block;
    border-radius:10px;
    padding:8px 10px;
    font-size:.95rem;
  }
  .chip.info  { background:#f4fff9; border:1px solid #d1f5e5; color:#1a6a58; }
  .chip.error { background:#fff5f4; border:1px solid #ffd9d5; color:#8c2f28; }

  .actions {
    margin-top:10px;
    display:flex; justify-content:flex-end;
  }
  .btn {
    border:none; border-radius:10px; padding:12px 16px;
    font-weight:700; cursor:pointer; font-size:14px;
  }
  .btn-primary { background:var(--teal); color:#fff; }
  .btn-primary:hover { background:var(--teal-dark); }
`;

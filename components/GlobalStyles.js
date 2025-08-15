// components/GlobalStyles.js
export default function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --storm: #141B4D;      /* Primary Dark */
        --teal: #279989;       /* Primary Accent */
        --teal-d: #1E7A6F;     /* Primary Accent hover */
        --sea: #F8F7EC;        /* Page background */
        --wave: #D6D2C4;       /* Secondary BG */
        --char: #3A3A3A;       /* Neutral Text */
        --cloud: #E9E9E9;      /* Borders */
        --tint: #ECF6F4;       /* Focus glow */
        --coral: #E86A5E;      /* Attention */
        --radius: 12px;

        --shadow-sm: 0 2px 6px rgba(0,0,0,.05);
        --shadow-md: 0 4px 10px rgba(0,0,0,.05);
      }

      html, body { height: 100%; }
      body {
        background: var(--sea);
        color: var(--char);
        font-family: var(--font-source, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      h1, h2, h3, h4 {
        color: var(--storm);
        font-family: var(--font-poppins, inherit);
        letter-spacing: .5px;
      }

      a { color: var(--teal); text-decoration: none; }
      a:hover { text-decoration: underline; }

      img { max-width: 100%; height: auto; }

      /* Accessible focus */
      :focus-visible {
        outline: 2px solid var(--teal);
        outline-offset: 2px;
        box-shadow: 0 0 0 4px var(--tint);
        border-radius: 6px;
      }

      /* ===== Utilities (namespaced) ===== */

      /* layout */
      .pp-wrap { max-width: 1100px; margin: 24px auto 90px; padding: 0 12px; }
      @media (min-width: 768px) {
        .pp-wrap { margin: 32px auto 100px; padding: 0 16px; }
      }

      /* cards */
      .pp-card { background:#fff; border:1px solid var(--cloud); border-radius: var(--radius); box-shadow: var(--shadow-md); }
      .pp-card--pad { padding: 20px; }

      /* form fields */
      .pp-field { display: flex; flex-direction: column; gap: 6px; }
      .pp-field label {
        font-family: var(--font-poppins);
        font-weight: 600;
        color: var(--storm);
        font-size: .95rem;
      }
      .pp-input, .pp-select, .pp-textarea {
        width: 90%;
        background: #fff;
        border: 1px solid var(--cloud);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 15px;
        color: var(--char);
        outline: none;
        transition: border-color .15s, box-shadow .15s;
      }
      .pp-textarea { resize: vertical; min-height: 120px; }
      .pp-input:focus, .pp-select:focus, .pp-textarea:focus {
        border-color: var(--teal);
        box-shadow: 0 0 0 4px var(--tint);
      }

      /* grid */
      .pp-grid2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
      @media (min-width: 768px) {
        .pp-grid2 { grid-template-columns: 1fr 1fr; gap: 16px; }
      }

      /* actions row */
      .pp-actions { display: flex; gap: 12px; justify-content: flex-end; }

      /* buttons */
      .pp-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 700;
        border-radius: 10px;
        padding: 10px 14px;
        border: 0;
        cursor: pointer;
        text-decoration: none;
      }
      .pp-btn--primary { background: var(--teal); color: #fff; }
      .pp-btn--primary:hover { background: var(--teal-d); }
      .pp-btn--secondary { background: #fff; color: var(--storm); border: 2px solid var(--storm); }
      .pp-btn--secondary:hover { background: var(--storm); color: #fff; }
      .pp-btn[disabled] { opacity: .6; cursor: not-allowed; }

      /* badges */
      .pp-badge { display: inline-block; border-radius: 6px; padding: 4px 8px; font-weight: 700; font-size: .8rem; }
      .pp-badge--coral { background: var(--coral); color: #fff; }

      /* a11y helper */
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
      }
    `}</style>
  );
}

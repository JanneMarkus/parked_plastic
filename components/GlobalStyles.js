// components/GlobalStyles.js
export default function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --storm: #141b4d; /* Primary Dark */
        --teal: #279989; /* Primary Accent */
        --teal-d: #1e7a6f; /* Primary Accent hover */
        --sea: #f8f7ec; /* Page background */
        --wave: #d6d2c4; /* Secondary BG */
        --char: #3a3a3a; /* Neutral Text */
        --cloud: #e9e9e9; /* Borders */
        --tint: #ecf6f4; /* Focus glow */
        --coral: #e86a5e; /* Attention */
        --radius: 12px;

        --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 10px rgba(0, 0, 0, 0.05);
      }

      html,
      body {
        height: 100%;
      }
      body {
        background: var(--sea);
        color: var(--char);
        font-family: var(
          --font-source,
          system-ui,
          -apple-system,
          Segoe UI,
          Roboto,
          Arial,
          sans-serif
        );
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      h1,
      h2,
      h3,
      h4 {
        color: var(--storm);
        font-family: var(--font-poppins, inherit);
        letter-spacing: 0.5px;
      }

      a {
        color: var(--teal);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      /* Accessible focus */
      :focus-visible {
        outline: 2px solid var(--teal);
        outline-offset: 2px;
        box-shadow: 0 0 0 4px var(--tint);
        border-radius: 6px;
      }

      /* ===== Utilities (namespaced) ===== */

      /* layout */
      .pp-wrap {
        max-width: 1100px;
        margin: 24px auto 90px;
        padding: 0 12px;
      }
      @media (min-width: 768px) {
        .pp-wrap {
          margin: 32px auto 100px;
          padding: 0 16px;
        }
      }

      /* cards */
      .pp-card {
        background: #fff;
        border: 1px solid var(--cloud);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
      }
      .pp-card--pad {
        padding: 20px;
      }

      /* form fields */
      .pp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pp-field label {
        font-family: var(--font-poppins);
        font-weight: 600;
        color: var(--storm);
        font-size: 0.95rem;
      }
      .pp-input,
      .pp-select,
      .pp-textarea {
        width: 90%;
        background: #fff;
        border: 1px solid var(--cloud);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 15px;
        color: var(--char);
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pp-textarea {
        resize: vertical;
        min-height: 120px;
      }
      .pp-input:focus,
      .pp-select:focus,
      .pp-textarea:focus {
        border-color: var(--teal);
        box-shadow: 0 0 0 4px var(--tint);
      }

      /* grid */
      .pp-grid2 {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      @media (min-width: 768px) {
        .pp-grid2 {
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
      }

      /* actions row */
      .pp-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

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
      .pp-btn--primary {
        background: var(--teal);
        color: #fff;
      }
      .pp-btn--primary:hover {
        background: var(--teal-d);
      }
      .pp-btn--secondary {
        background: #fff;
        color: var(--storm);
        border: 2px solid var(--storm);
      }
      .pp-btn--secondary:hover {
        background: var(--storm);
        color: #fff;
      }
      .pp-btn[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* badges */
      .pp-badge {
        display: inline-block;
        border-radius: 6px;
        padding: 4px 8px;
        font-weight: 700;
        font-size: 0.8rem;
      }
      .pp-badge--coral {
        background: var(--coral);
        color: #fff;
      }
      .pp-badge--storm {
        background: var(--storm);
        color: #fff;
      }
      .pp-badge--teal {
        background: var(--teal);
        color: #fff;
      }

      /* a11y helper */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      /* ── Dual-range slider: Soft/Minimal theme (global) ────────────────── */

      .pp-range-label {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 2px;
      }

      .pp-dualrange::before,
.pp-dualrange::after {
  z-index: 1;                /* track + teal fill below */
}

/* Inputs (and their thumbs) above the track, and vertically centered */
.pp-dualrange input[type="range"]{
  position: absolute;
  left: 0; right: 0;
  top: 50%;
  transform: translateY(30%);  /* centers the slider box vertically */
  width: 100%;
  height: var(--thumb);         /* ensures thumb is centered over the track */
  margin: 0;                    /* Safari alignment quirk */
  background: transparent;
  pointer-events: none;         /* thumbs handle events */
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  accent-color: var(--teal);
  z-index: 2;                   /* above ::before/::after */
}
      .pp-range-readout {
        font-family: var(--font-source, system-ui);
        font-size: 13px;
        color: var(--storm);
        opacity: 0.9;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .pp-range-readout .pp-clear {
        padding: 0 6px;
        border-radius: 8px;
        font-size: 12px;
      }
      .pp-clear {
        appearance: none;
        background: #fff;
        border: 1px solid var(--cloud);
        color: var(--storm);
        font-weight: 700;
        border-radius: 999px;
        line-height: 1;
        padding: 1px 7px 2px;
        cursor: pointer;
      }
      .pp-clear:hover {
        background: #f7f7f7;
      }

      .pp-dualrange {
        --track-h: 10px;
        --thumb: 20px;
        position: relative;
        height: calc(var(--thumb) + 12px);
        padding: 6px 0;
      }
      /* Base track */
      .pp-dualrange::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: var(--track-h);
        border-radius: 999px;
        background: linear-gradient(180deg, #f9fafb, #ececec);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
      }
      /* Selected segment (uses --l and --r from inline style) */
      .pp-dualrange::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: var(--track-h);
        border-radius: 999px;
        pointer-events: none;
        background: linear-gradient(
          to right,
          transparent 0%,
          transparent var(--l),
          var(--teal) var(--l),
          var(--teal) var(--r),
          transparent var(--r),
          transparent 100%
        );
      }

      /* Stack the two inputs and hide their default tracks */
      .pp-dualrange input[type="range"] {
        position: absolute;
        inset: 0;
        width: 100%;
        background: transparent;
        pointer-events: none;
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        accent-color: var(--teal);
      }
      .pp-dualrange input[type="range"]::-webkit-slider-runnable-track {
        background: transparent;
        height: var(--track-h);
      }
      .pp-dualrange input[type="range"]::-moz-range-track {
        background: transparent;
        height: var(--track-h);
      }

      /* Thumbs */
      .pp-dualrange input[type="range"]::-webkit-slider-thumb {
        pointer-events: auto;
        -webkit-appearance: none;
        appearance: none;
        height: var(--thumb);
        width: var(--thumb);
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--teal);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        transition: transform 0.08s ease, box-shadow 0.12s ease;
      }
      .pp-dualrange input[type="range"]::-moz-range-thumb {
        pointer-events: auto;
        height: var(--thumb);
        width: var(--thumb);
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--teal);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        transition: transform 0.08s ease, box-shadow 0.12s ease;
      }
      .pp-dualrange input[type="range"]:hover::-webkit-slider-thumb,
      .pp-dualrange input[type="range"]:hover::-moz-range-thumb {
        transform: scale(1.04);
      }
      .pp-dualrange input[type="range"]:active::-webkit-slider-thumb,
      .pp-dualrange input[type="range"]:active::-moz-range-thumb {
        transform: scale(1.06);
      }
      .pp-dualrange input[type="range"]:focus-visible::-webkit-slider-thumb,
      .pp-dualrange input[type="range"]:focus-visible::-moz-range-thumb {
        box-shadow: 0 0 0 6px rgba(39, 153, 137, 0.18),
          0 2px 6px rgba(0, 0, 0, 0.12);
      }
    `}</style>
  );
}

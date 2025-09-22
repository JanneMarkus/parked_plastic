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
        --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.12);
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

      /* extra button utility kept from your file */
      .btn-coral {
        background: var(--coral);
        color: #fff;
        font-weight: 700;
      }
      .btn-coral:hover {
        background: #d85b50;
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

      /* ─────────────────────────────────────────────────────────────
         Listing Card Upgrades (shared styles)
      ───────────────────────────────────────────────────────────── */

      /* Card grid */
      .grid-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      .listing-card {
        text-decoration: none;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: box-shadow 0.18s ease, transform 0.18s ease;
      }
      .listing-card:hover {
        text-decoration: none;
        transform: None;
        box-shadow: var(--shadow-lg);
        border-color: #d9dee6;
      }

      .img-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: var(--cloud);
        border-radius: var(--radius) var(--radius) 0 0;
        isolation: isolate;
      }
      .img-wrap .img {
        transition: transform 0.35s ease;
        will-change: transform;
      }
      .listing-card:hover .img-wrap .img {
        transform: scale(1.05);
      }

      /* Pills over the image */
      .pp-pill {
        position: absolute;
        bottom: 10px;
        padding: 6px 10px;
        border-radius: 999px;
        font-weight: 800;
        font-size: 0.85rem;
        letter-spacing: 0.2px;
        color: #fff;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        z-index: 2;
      }
      .pill--price {
        left: 10px;
        background: var(--teal);
      }
      .pill--cond {
        right: 10px;
      }
      /* Condition palette mapping */
      /* Condition palette mapping */
      .cond--gold {
        background: #ffd700;
        color: #7a5c00; /* royal gold text */
        text-shadow: none;
      }
      .cond--green {
        background: #219653; /* 6–7 */
        color: #fff;
      }
      .cond--green-rich {
        background: #006400; /* 8–9 */
        color: #fff;
      }
      .cond--orange {
        background: #f2994a; /* 4–5 */
        color: #fff;
      }
      .cond--red {
        background: var(--coral); /* 3 or less */
        color: #fff;
      }

      /* SOLD / PENDING overlays */
      .listing-card.is-sold :global(.img),
      .listing-card.is-pending :global(.img) {
        filter: grayscale(1) brightness(0.92) contrast(1.05);
        opacity: 0.95;
      }
      .listing-card.is-sold .img-wrap::after,
      .listing-card.is-pending .img-wrap::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(transparent, rgba(20, 27, 77, 0.22));
        pointer-events: none;
      }
      .soldBanner,
      .pendingBanner {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 10px 18px;
        border-radius: 14px;
        font-family: var(--font-poppins, system-ui);
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #fff;
        background: rgba(20, 27, 77, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 10px 24px rgba(20, 27, 77, 0.25);
        pointer-events: none;
      }

      .content {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cardTitle {
        font-family: var(--font-poppins, system-ui);
        font-weight: 600;
        margin: 0;
        font-size: 1.05rem;
        color: var(--storm);
      }
      .sellerLine {
        font-size: 0.85rem;
        color: var(--char);
        opacity: 0.85;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: -2px;
      }
      .sellerLine .asLink {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        text-decoration: none;
        font-weight: 600;
      }
      .sellerLine .asLink:hover {
        text-decoration: underline;
        color: var(--storm);
      }

      .flightline {
        margin-top: -2px;
        font-family: var(--font-source, system-ui);
        font-size: 14px;
        color: var(--storm);
        opacity: 0.85;
      }
      .meta {
        font-size: 0.9rem;
        opacity: 0.95;
      }
      .specs {
        font-size: 0.9rem;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
        margin-bottom: auto;
      }
      .specs span:not(:last-child)::after {
        content: "•";
        margin-left: 8px;
        color: var(--cloud);
      }

      /* Filters & form UI */
      .pp-range-label {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 2px;
      }
      .pp-dualrange::before,
      .pp-dualrange::after {
        z-index: 1;
      }
      /* Center slider inputs and thumbs on the track */
      .pp-dualrange input[type="range"] {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-75%); /* <-- fixed centering */
        width: 100%;
        height: var(--thumb);
        margin: 0; /* Safari alignment quirk */
        background: transparent;
        pointer-events: none; /* thumbs handle events */
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        accent-color: var(--teal);
        z-index: 2; /* above ::before/::after */
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
      .pp-dualrange input[type="range"]::-webkit-slider-runnable-track {
        background: transparent;
        height: var(--track-h);
      }
      .pp-dualrange input[type="range"]::-moz-range-track {
        background: transparent;
        height: var(--track-h);
      }
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

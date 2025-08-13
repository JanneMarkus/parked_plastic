// components/BrandLogo.js
// Header-friendly Parked Plastic logo with equal-sized disc stack.
// Props:
//   variant: "header" | "boxed" (default: "header")
//     - "header": discs + wordmark (transparent background), sized for a 64px header
//     - "boxed": reproduces your Storm Blue card with faint basket silhouette (for hero/splash)
//   ariaLabel: accessible label for screen readers

export default function BrandLogo({ variant = "header", ariaLabel = "Parked Plastic" }) {
  if (variant === "boxed") {
    return (
      <div className="logo-container-3" aria-label={ariaLabel}>
        <div className="stacked-discs">
          <div className="disc disc-bottom" />
          <div className="disc disc-middle" />
          <div className="disc disc-top" />
        </div>
        <div className="logo-text-3">
          PARKED<br /><span>PLASTIC</span>
        </div>

        <style jsx>{`
          .logo-container-3 {
            background-color: #141B4D; /* Storm Blue */
            padding: 30px 40px;
            border-radius: 10px;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
            user-select: none;
          }
          /* faint basket silhouette */
          .logo-container-3::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 150px;
            height: 150px;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5L20 25h60zM25 25v50h50V25zM20 75h60M25 75v10h50v-10" fill="none" stroke="%23D6D2C4" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>');
            background-size: contain;
            background-repeat: no-repeat;
            opacity: 0.08;
            transform: translate(-50%, -50%) rotate(15deg);
            z-index: 0;
          }

          .stacked-discs {
            width: 90px;   /* your sizes */
            height: 60px;  /* overall stack height */
            position: relative;
            margin-bottom: 20px;
            z-index: 1;
          }
          .disc {
            position: absolute;
            width: 90px;
            height: 25px;
            border-radius: 50% / 50%;
            border: 2px solid rgba(255,255,255,0.7);
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            left: 50%;
            transform: translateX(-50%); /* equal-sized discs */
          }
          .disc-top {
            top: 0;
            background-color: #279989; /* Caribbean Sea */
            z-index: 5;
          }
          .disc-middle {
            top: 13px;
            background-color: #ECF6F4; /* Light Teal Tint */
            z-index: 4;
          }
          .disc-bottom {
            top: 26px;
            background-color: #D6D2C4; /* Wave Crest */
            z-index: 3;
          }

          .logo-text-3 {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 2.2rem;
            color: #fff;
            text-align: center;
            line-height: 1.1;
            letter-spacing: 0.05em;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
            z-index: 1;
          }
          .logo-text-3 span {
            display: block;
            font-size: 1.4rem;
            margin-top: 5px;
            letter-spacing: 0.08em;
          }
        `}</style>
      </div>
    );
  }

  // Default "header" variant: compact for a 64px-tall nav bar, transparent background.
  return (
    <div className="pp-logo" aria-label={ariaLabel}>
      <div className="stacked-discs" aria-hidden="true">
        <div className="disc disc-bottom" />
        <div className="disc disc-middle" />
        <div className="disc disc-top" />
      </div>
      <div className="logo-text">
        <span className="line1">PARKED</span>
        <span className="line2">PLASTIC</span>
      </div>

      <style jsx>{`
        .pp-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          line-height: 1;
          user-select: none;
          color: #fff; /* header is Storm Blue, so white text */
        }
        /* Compact, proportional version of your equal-sized stack */
        .stacked-discs {
          position: relative;
          width: 46px;
          height: 30px;
        }
        .disc {
          position: absolute;
          width: 46px;
          height: 12px;
          border-radius: 50% / 50%;
          border: 1.5px solid rgba(255,255,255,0.7);
          box-shadow: 0 2px 6px rgba(0,0,0,0.28);
          left: 50%;
          transform: translateX(-50%); /* equal-sized discs */
        }
        .disc-top {
          top: 0;
          background: #279989;   /* Caribbean Sea */
          z-index: 5;
        }
        .disc-middle {
          top: 6.5px;            /* proportional overlap to your 13px */
          background: #ECF6F4;   /* Light Teal Tint */
          z-index: 4;
        }
        .disc-bottom {
          top: 13px;             /* proportional overlap to your 26px */
          background: #D6D2C4;   /* Wave Crest */
          z-index: 3;
        }

        .logo-text {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
        }
        .line1 { font-size: 16px; }
        .line2 { font-size: 12px; margin-top: 2px; letter-spacing: 0.08em; }
      `}</style>
    </div>
  );
}

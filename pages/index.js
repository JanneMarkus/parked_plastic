// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Poppins, Source_Sans_3 } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { getBlurDataURL } from "@/lib/blurClient";
import GlobalStyles from "@/components/GlobalStyles";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  // Match GlobalStyles expectation of --font-source
  variable: "--font-source",
});

const CONDITION_OPTIONS = ["New", "Like New", "Excellent", "Good", "Used", "Beat"];

function useDebouncedValue(value, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Home() {
  const [discs, setDiscs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [includeSold, setIncludeSold] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [speedMin, setSpeedMin] = useState("");
  const [speedMax, setSpeedMax] = useState("");
  const [glideMin, setGlideMin] = useState("");
  const [glideMax, setGlideMax] = useState("");
  const [turnMin, setTurnMin] = useState("");
  const [turnMax, setTurnMax] = useState("");
  const [fadeMin, setFadeMin] = useState("");
  const [fadeMax, setFadeMax] = useState("");

  // Blur placeholder cache
  const [blurs, setBlurs] = useState({});
  const prefetchingRef = useRef(false);

  const debouncedSearch = useDebouncedValue(search, 450);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("discs")
          // include flight number columns
          .select("id,title,brand,mold,weight,condition,price,is_sold,image_urls,created_at,speed,glide,turn,fade")
          .order("created_at", { ascending: false });

        if (!includeSold) query = query.eq("is_sold", false);

        const term = debouncedSearch.trim();
        if (term) {
          const like = `%${term}%`;
          query = query.or(
            [
              `title.ilike.${like}`,
              `brand.ilike.${like}`,
              `mold.ilike.${like}`,
              `plastic.ilike.${like}`,
              `description.ilike.${like}`,
            ].join(",")
          );
        }

        if (brand.trim()) query = query.ilike("brand", brand.trim());
        if (mold.trim()) query = query.ilike("mold", mold.trim());
        if (condition) query = query.eq("condition", condition);

        const minP = minPrice !== "" ? Number(minPrice) : null;
        const maxP = maxPrice !== "" ? Number(maxPrice) : null;
        if (minP !== null && !Number.isNaN(minP)) query = query.gte("price", minP);
        if (maxP !== null && !Number.isNaN(maxP)) query = query.lte("price", maxP);

        const minW = minWeight !== "" ? Number(minWeight) : null;
        const maxW = maxWeight !== "" ? Number(maxWeight) : null;
        if (minW !== null && !Number.isNaN(minW)) query = query.gte("weight", minW);
        if (maxW !== null && !Number.isNaN(maxW)) query = query.lte("weight", maxW);

        // Flight ranges helper
        const rng = (val) => (val !== "" && val !== null ? Number(val) : null);
        const sMin = rng(speedMin), sMax = rng(speedMax);
        const gMin = rng(glideMin), gMax = rng(glideMax);
        const tMin = rng(turnMin),  tMax = rng(turnMax);
        const fMin = rng(fadeMin),  fMax = rng(fadeMax);
        if (sMin !== null && !Number.isNaN(sMin)) query = query.gte("speed", sMin);
        if (sMax !== null && !Number.isNaN(sMax)) query = query.lte("speed", sMax);
        if (gMin !== null && !Number.isNaN(gMin)) query = query.gte("glide", gMin);
        if (gMax !== null && !Number.isNaN(gMax)) query = query.lte("glide", gMax);
        if (tMin !== null && !Number.isNaN(tMin)) query = query.gte("turn", tMin);
        if (tMax !== null && !Number.isNaN(tMax)) query = query.lte("turn", tMax);
        if (fMin !== null && !Number.isNaN(fMin)) query = query.gte("fade", fMin);
        if (fMax !== null && !Number.isNaN(fMax)) query = query.lte("fade", fMax);

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setDiscs(data || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setDiscs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    brand, mold, condition,
    minPrice, maxPrice, minWeight, maxWeight,
    // flight numbers
    speedMin, speedMax, glideMin, glideMax, turnMin, turnMax, fadeMin, fadeMax,
    includeSold
  ]);

  // Prefetch blurDataURL
  useEffect(() => {
    if (prefetchingRef.current) return;
    const candidates = discs
      .map((d) => d.image_urls?.[0])
      .filter(Boolean)
      .slice(0, 8)
      .filter((src) => !blurs[src]);
    if (candidates.length === 0) return;

    prefetchingRef.current = true;
    (async () => {
      const entries = await Promise.all(candidates.map(async (src) => [src, await getBlurDataURL(src)]));
      setBlurs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      prefetchingRef.current = false;
    })();
  }, [discs, blurs]);

  const activeFiltersCount = useMemo(() => {
    return (
      [
        brand.trim(),
        mold.trim(),
        condition,
        minPrice !== "" ? "minPrice" : "",
        maxPrice !== "" ? "maxPrice" : "",
        minWeight !== "" ? "minWeight" : "",
        maxWeight !== "" ? "maxWeight" : "",
        includeSold ? "includeSold" : "",
      ].filter(Boolean).length + (debouncedSearch.trim() ? 1 : 0)
    );
  }, [
    brand, mold, condition,
    minPrice, maxPrice, minWeight, maxWeight,
    speedMin, speedMax, glideMin, glideMax, turnMin, turnMax, fadeMin, fadeMax,
    debouncedSearch, includeSold
  ]);

  function resetFilters() {
    setSearch("");
    setBrand("");
    setMold("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setMinWeight("");
    setMaxWeight("");
    setIncludeSold(false);
  }

  return (
    <>
      <Head>
        <title>Parked Plastic — Disc Listings</title>
        <meta
          name="description"
          content="Browse used disc golf listings. Filter by brand, mold, condition, weight, and price — or search everything."
        />
      </Head>

      <GlobalStyles />

      <main className={`${poppins.variable} ${sourceSans.variable} pp-wrap`}>
        <h1 className="pageTitle">Parked Plastic — Disc Listings</h1>
        <p className="sub">Browse used discs. Search everything, or expand filters for finer control.</p>

        {/* Filters */}
        <section className="filters" aria-label="Search and filters">
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Always-visible search row */}
            <div className="bar">
              <div className="pp-field grow">
                <label htmlFor="search">Search</label>
                <input
                  id="search"
                  className="pp-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, brand, mold, plastic, description…"
                  autoComplete="off"
                  inputMode="search"
                />
              </div>
              <div className="bar-actions">
                {activeFiltersCount > 0 && (
                  <span className="pp-badge pp-badge--coral" aria-label={`${activeFiltersCount} active filters`}>
                    {activeFiltersCount} active
                  </span>
                )}
                {activeFiltersCount > 0 && (
                  <button className="pp-btn pp-btn--secondary" type="button" onClick={resetFilters}>
                    Reset
                  </button>
                )}
                <button
                  className="pp-btn pp-btn--secondary"
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters ? "true" : "false"}
                  aria-controls="filter-grid"
                >
                  {showFilters ? "Hide filters" : "Show filters"}
                </button>
              </div>
            </div>

            {/* Collapsible filter grid */}
            {showFilters && (
              <div id="filter-grid" className="grid">
                <div className="pp-field">
                  <label htmlFor="brand">Brand</label>
                  <input
                    id="brand"
                    className="pp-input"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Innova, Discraft, MVP…"
                    autoComplete="off"
                  />
                </div>

                <div className="pp-field">
                  <label htmlFor="mold">Mold</label>
                  <input
                    id="mold"
                    className="pp-input"
                    type="text"
                    value={mold}
                    onChange={(e) => setMold(e.target.value)}
                    placeholder="Destroyer, Buzzz, Hex…"
                    autoComplete="off"
                  />
                </div>

                <div className="pp-field">
                  <label htmlFor="condition">Condition</label>
                  <select
                    id="condition"
                    className="pp-select"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="">Any</option>
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pp-field">
                  <label htmlFor="minWeight">Min Weight (g)</label>
                  <input
                    id="minWeight"
                    className="pp-input"
                    type="number"
                    min={120}
                    max={200}
                    placeholder="165"
                    value={minWeight}
                    onChange={(e) => setMinWeight(e.target.value)}
                    inputMode="numeric"
                  />
                </div>

                <div className="pp-field">
                  <label htmlFor="maxWeight">Max Weight (g)</label>
                  <input
                    id="maxWeight"
                    className="pp-input"
                    type="number"
                    min={120}
                    max={200}
                    placeholder="180"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(e.target.value)}
                    inputMode="numeric"
                  />
                </div>

                <div className="pp-field">
                  <label htmlFor="minPrice">Min Price (CAD)</label>
                  <input
                    id="minPrice"
                    className="pp-input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="10.00"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    inputMode="decimal"
                  />
                </div>

                <div className="pp-field">
                  <label htmlFor="maxPrice">Max Price (CAD)</label>
                  <input
                    id="maxPrice"
                    className="pp-input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="35.00"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                
                {/* ===== Flight number range filters ===== */}
                <div className="pp-field flight">
                  <label>Speed</label>
                  <div className="row">
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={15} placeholder="Min"
                      value={speedMin} onChange={(e)=>setSpeedMin(e.target.value)} inputMode="decimal"
                    />
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={15} placeholder="Max"
                      value={speedMax} onChange={(e)=>setSpeedMax(e.target.value)} inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="pp-field flight">
                  <label>Glide</label>
                  <div className="row">
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={7} placeholder="Min"
                      value={glideMin} onChange={(e)=>setGlideMin(e.target.value)} inputMode="decimal"
                    />
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={7} placeholder="Max"
                      value={glideMax} onChange={(e)=>setGlideMax(e.target.value)} inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="pp-field flight">
                  <label>Turn</label>
                  <div className="row">
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={-5} max={5} placeholder="Min"
                      value={turnMin} onChange={(e)=>setTurnMin(e.target.value)} inputMode="decimal"
                    />
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={-5} max={5} placeholder="Max"
                      value={turnMax} onChange={(e)=>setTurnMax(e.target.value)} inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="pp-field flight">
                  <label>Fade</label>
                  <div className="row">
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={5} placeholder="Min"
                      value={fadeMin} onChange={(e)=>setFadeMin(e.target.value)} inputMode="decimal"
                    />
                    <input
                      className="pp-input"
                      type="number" step="0.5" min={0} max={5} placeholder="Max"
                      value={fadeMax} onChange={(e)=>setFadeMax(e.target.value)} inputMode="decimal"
                    />
                  </div>
                </div>


                <div className="toggles">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={includeSold}
                      onChange={(e) => setIncludeSold(e.target.checked)}
                    />
                    Include sold listings
                  </label>
                </div>
              </div>
            )}
          </form>
        </section>

        <div className="resultbar" aria-live="polite" aria-atomic="true">
          <div>{loading ? "Loading…" : `${discs.length} result${discs.length === 1 ? "" : "s"}`}</div>
        </div>

        {/* Cards — match Account page look & feel */}
        <div className="grid-cards" aria-busy={loading ? "true" : "false"}>
          {discs.map((d, idx) => {
            const src = d.image_urls?.[0];
            const hasImage = !!src;
            const price =
              d.price != null && Number.isFinite(Number(d.price)) ? `$${Number(d.price).toFixed(2)}` : null;

            return (
              <Link
                href={`/listings/${d.id}`}
                key={d.id}
                className={`pp-card listing-card ${d.is_sold ? "is-sold" : ""}`}
                aria-label={`View ${d.title}`}
                title={d.title}
                prefetch={idx < 6}
              >
                <div className="img-wrap">
                  {hasImage ? (
                    <Image
                      className="img"
                      src={src}
                      alt={d.title}
                      fill
                      placeholder={blurs[src] ? "blur" : undefined}
                      blurDataURL={blurs[src]}
                      sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                      priority={false}
                    />
                  ) : (
                    <div className="img placeholder" aria-label="No image available" />
                  )}
                  {d.is_sold && <div className="soldBanner">SOLD</div>}
                </div>

                <div className="content">
                  <h2 className="cardTitle">{d.title}</h2>
                  {/* Flight numbers compact line */}
                  {d.speed != null && d.glide != null && d.turn != null && d.fade != null && (
                    <div className="flightline" aria-label="Flight numbers">
                      {d.speed} / {d.glide} / {d.turn} / {d.fade}
                    </div>
                  )}
                  <div className="meta">
                    {d.brand || "—"}
                    {d.mold ? ` • ${d.mold}` : ""}
                  </div>
                  <div className="specs">
                    <span>{d.weight != null ? `${d.weight} g` : "N/A"}</span>
                    {d.condition && <span>{d.condition}</span>}
                  </div>
                  {price && <div className="price pp-badge pp-badge--coral">{price}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <style jsx>{`
        .pageTitle {
          text-align: center;
          margin: 0 0 12px;
          font-size: 1.6rem;
          letter-spacing: 0.5px;
        }
        .sub {
          text-align: center;
          margin: 0 0 16px;
        }

        /* Filters container */
        .filters {
          background: #fff;
          border: 1px solid var(--cloud);
          border-radius: var(--radius);
          box-shadow: var(--shadow-md);
          padding: 12px;
          margin-bottom: 16px;
        }
        .bar {
          display: flex;
          gap: 12px;
          align-items: end;
          flex-wrap: wrap;
        }

        .bar .grow {
          flex: 1 1 280px;
        }
        .bar-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-left: auto;
        }

        .grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          margin-top: 12px;
        }

        /* Flight filter rows */
        .flight .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 6px;
        }

        .checkbox {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .toggles {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .resultbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 4px 16px;
        }

        /* ===== Cards (Account parity + small hover polish) ===== */
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .listing-card {
          position: relative;
          overflow: hidden; /* clip rounded corners for image */
          display: flex;
          flex-direction: column;
          text-decoration: none;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
        }
        .listing-card:hover {
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: var(--cloud);
        }
        .img {
          transition: transform 0.25s ease;
        }
        .listing-card:hover .img {
          transform: scale(1.05);
        }

        .listing-card.is-sold .img {
          filter: grayscale(1) brightness(0.82) contrast(1.1);
          opacity: 0.9;
        }
        .listing-card.is-sold .img-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(transparent, rgba(20, 27, 77, 0.22));
          pointer-events: none;
        }
        .soldBanner {
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
        .price {
          align-self: flex-start;
        }

        /* Responsive layout */
        @media (min-width: 480px) {
          .pageTitle {
            font-size: 1.8rem;
          }
          .filters {
            padding: 14px;
          }
        }
        @media (min-width: 768px) {
          .pageTitle {
            font-size: 2rem;
            margin-bottom: 2px;
          }
        }
        @media (min-width: 1200px) {
          .pageTitle {
            font-size: 2.2rem;
          }
        }
      `}</style>
    </>
  );
}

// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Poppins, Source_Sans_3 } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { getBlurDataURL } from "@/lib/blurClient";

// ⚠️ Ensure your Supabase storage domain is allowed in next.config.mjs:
// export default { images: { remotePatterns: [{ protocol: "https", hostname: "reovcaxdkizsjddgacee.supabase.co", pathname: "/storage/v1/object/public/listing-images/**" }] } }

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
  variable: "--font-source-sans",
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

  // Filters (city intentionally omitted)
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [includeSold, setIncludeSold] = useState(false);

  // Blur placeholder cache (src -> dataURL)
  const [blurs, setBlurs] = useState({});
  const prefetchingRef = useRef(false);

  const debouncedSearch = useDebouncedValue(search, 450);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Select only needed columns (smaller payload than "*")
        let query = supabase
          .from("discs")
          .select("id,title,brand,mold,weight,condition,price,is_sold,image_urls,created_at")
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
  }, [debouncedSearch, brand, mold, condition, minPrice, maxPrice, minWeight, maxWeight, includeSold]);

  // Prefetch blurDataURL for the first ~8 images whenever the list updates
  useEffect(() => {
    if (prefetchingRef.current) return;
    const candidates = discs
      .map((d) => d.image_urls?.[0])
      .filter(Boolean)
      .slice(0, 8)
      .filter((src) => !blurs[src]); // only fetch unknown
    if (candidates.length === 0) return;

    prefetchingRef.current = true;
    (async () => {
      const entries = await Promise.all(
        candidates.map(async (src) => [src, await getBlurDataURL(src)])
      );
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
  }, [brand, mold, condition, minPrice, maxPrice, minWeight, maxWeight, debouncedSearch, includeSold]);

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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      <main className={`${poppins.variable} ${sourceSans.variable}`}>
        <h1 className="title">Parked Plastic — Disc Listings</h1>
        <p className="sub">
          Browse used discs. Filter by brand, mold, condition, weight, and price — or search
          everything.
        </p>

        <section className="filters" aria-label="Search and filters">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="field col-12">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, brand, mold, plastic, description…"
                autoComplete="off"
                inputMode="search"
              />
            </div>

            <div className="field col-6">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Innova, Discraft, MVP…"
                autoComplete="off"
              />
            </div>

            <div className="field col-6">
              <label htmlFor="mold">Mold</label>
              <input
                id="mold"
                type="text"
                value={mold}
                onChange={(e) => setMold(e.target.value)}
                placeholder="Destroyer, Buzzz, Hex…"
                autoComplete="off"
              />
            </div>

            <div className="field col-3">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
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

            <div className="field col-3">
              <label htmlFor="minWeight">Min Weight (g)</label>
              <input
                id="minWeight"
                type="number"
                min={120}
                max={200}
                placeholder="165"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="field col-3">
              <label htmlFor="maxWeight">Max Weight (g)</label>
              <input
                id="maxWeight"
                type="number"
                min={120}
                max={200}
                placeholder="180"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="field col-3">
              <label htmlFor="minPrice">Min Price (CAD)</label>
              <input
                id="minPrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="10.00"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                inputMode="decimal"
              />
            </div>

            <div className="field col-3">
              <label htmlFor="maxPrice">Max Price (CAD)</label>
              <input
                id="maxPrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="35.00"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                inputMode="decimal"
              />
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

            <div className="actions">
              {activeFiltersCount > 0 && (
                <span className="badge" aria-label={`${activeFiltersCount} active filters`}>
                  {activeFiltersCount} active
                </span>
              )}
              <button className="btn btn-secondary" type="button" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </form>
        </section>

        <div className="resultbar" aria-live="polite" aria-atomic="true">
          <div>{loading ? "Loading…" : `${discs.length} result${discs.length === 1 ? "" : "s"}`}</div>
        </div>

        <div className="grid" aria-busy={loading ? "true" : "false"}>
          {discs.map((d, idx) => {
            const src = d.image_urls?.[0];
            const hasImage = !!src;
            return (
              <Link
                href={`/listings/${d.id}`}
                key={d.id}
                className={`card ${d.is_sold ? "sold" : ""}`}
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
                      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 280px"
                    />
                  ) : (
                    <div className="img placeholder" aria-label="No image available" />
                  )}
                  {d.is_sold && (
                    <div className="soldBanner" aria-label="Sold">
                      SOLD
                    </div>
                  )}
                </div>

                <div className="content">
                  <h2 className="cardTitle">{d.title}</h2>
                  <div className="meta">
                    {d.brand || "—"}
                    {d.mold ? ` • ${d.mold}` : ""}
                  </div>
                  <div className="specs">
                    <span>{d.weight != null ? `${d.weight} g` : "N/A"}</span>
                    {d.condition && <span>{d.condition}</span>}
                  </div>
                  {d.price != null && (
                    <div className="price">${Number(d.price).toFixed(2)}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <style jsx>{`
        /* Brand tokens */
        :root {
          --storm-blue: #141b4d;
          --caribbean-sea: #279989;
          --sea-mist: #f8f7ec;
          --wave-crest: #d6d2c4;
          --soft-charcoal: #3a3a3a;
          --cloud-grey: #e9e9e9;
          --highlight-coral: #e86a5e;
          --light-teal-tint: #ecf6f4;
        }

        /* Mobile-first layout */
        main {
          max-width: 1200px;
          margin: 24px auto 72px;
          padding: 0 12px;
          font-family: var(--font-source-sans), system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans,
            "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
          color: var(--soft-charcoal);
          background: var(--sea-mist);
        }

        .title {
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: var(--storm-blue);
          text-align: center;
          margin: 0 0 12px;
          font-size: 1.6rem;
        }

        .sub {
          text-align: center;
          margin: 0 0 16px;
        }

        /* Filters */
        .filters {
          background: #fff;
          border: 1px solid var(--cloud-grey);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          margin-bottom: 16px;
        }

        .filters form {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(6, 1fr); /* mobile grid */
          align-items: end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 0.85rem;
          color: var(--storm-blue);
          font-weight: 600;
          font-family: var(--font-poppins), system-ui, sans-serif;
        }

        .field input,
        .field select {
          background: #fff;
          border: 1px solid var(--cloud-grey);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }

        .field input:focus,
        .field select:focus {
          border-color: var(--caribbean-sea);
          box-shadow: 0 0 0 4px var(--light-teal-tint);
        }

        .col-12 {
          grid-column: span 6; /* mobile full row */
        }
        .col-6 {
          grid-column: span 6;
        }
        .col-3 {
          grid-column: span 3;
        }

        .checkbox {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .toggles {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-right: auto;
          grid-column: span 6;
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: stretch;
          align-items: center;
          grid-column: span 6;
        }

        .badge {
          display: inline-block;
          background: var(--highlight-coral);
          color: #fff;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .btn {
          border: none;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-secondary {
          background: #fff;
          color: var(--storm-blue);
          border: 2px solid var(--storm-blue);
        }
        .btn-secondary:hover {
          background: var(--storm-blue);
          color: #fff;
        }

        /* Cards */
        .grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }

        .card {
          position: relative;
          background: var(--wave-crest);
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
        }

        .card:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }

        .img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3; /* enforce 4:3 listing photos */
          overflow: hidden;
          background: var(--cloud-grey);
          border-bottom: 1px solid var(--cloud-grey);
        }

        :global(.img) {
          object-fit: cover;
          transition: filter 0.2s ease, opacity 0.2s ease;
        }

        .placeholder {
          width: 100%;
          height: 100%;
        }

        .sold .img {
          filter: grayscale(1) brightness(0.82) contrast(1.1);
          opacity: 0.88;
        }
        .sold .img-wrap::after {
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
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(20, 27, 77, 0.88); /* Storm Blue */
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 24px rgba(20, 27, 77, 0.25);
          backdrop-filter: blur(2px);
          z-index: 2;
        }

        .content {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }

        .cardTitle {
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-weight: 600;
          color: var(--storm-blue);
          font-size: 1.05rem;
          margin: 0;
        }

        .meta {
          font-size: 0.9rem;
          color: var(--soft-charcoal);
        }

        .specs {
          font-size: 0.9rem;
          color: var(--soft-charcoal);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 2px;
          margin-bottom: auto;
        }

        .specs span:not(:last-child)::after {
          content: "•";
          margin-left: 8px;
          color: var(--cloud-grey);
        }

        .price {
          font-family: var(--font-poppins), system-ui, sans-serif;
          font-weight: 600;
          color: var(--storm-blue);
          font-size: 1.02rem;
          margin-top: 6px;
        }

        .resultbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 4px 16px;
          color: var(--soft-charcoal);
        }

        /* ≥480px */
        @media (min-width: 480px) {
          .title {
            font-size: 1.8rem;
          }
          .filters {
            padding: 14px;
          }
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }
        }

        /* ≥768px */
        @media (min-width: 768px) {
          main {
            margin: 32px auto 80px;
            padding: 0 16px;
          }
          .title {
            font-size: 2rem;
            margin-bottom: 16px;
          }
          .filters form {
            grid-template-columns: repeat(12, 1fr);
            gap: 12px;
          }
          .col-12 {
            grid-column: span 12;
          }
          .col-6 {
            grid-column: span 6;
          }
          .col-3 {
            grid-column: span 3;
          }
          .toggles,
          .actions {
            grid-column: span 12;
          }
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 24px;
          }
        }

        /* ≥1200px */
        @media (min-width: 1200px) {
          .title {
            font-size: 2.2rem;
          }
          .grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 24px;
          }
        }
      `}</style>
    </>
  );
}

// pages/index.js
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const CONDITION_OPTIONS = ["New", "Like New", "Excellent", "Good", "Used", "Beat"];

function useDebouncedValue(value, delay = 400) {
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

  // Filters (city omitted for now)
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [mold, setMold] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [includeSold, setIncludeSold] = useState(false); // hidden by default

  const debouncedSearch = useDebouncedValue(search, 450);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let query = supabase.from("discs").select("*").order("created_at", { ascending: false });

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
      <style>{`
        main { max-width: 1200px; margin: 32px auto 80px; padding: 0 16px; }
        h1 { font-family: 'Poppins', sans-serif; font-weight:600; letter-spacing:.5px; color:#141B4D; text-align:center; margin: 0 0 20px; font-size:2.2rem; }
        .sub { text-align:center; margin: 0 0 24px; color:#3A3A3A; }

        /* Filters */
        .filters { background:#fff; border:1px solid #E9E9E9; border-radius:12px; padding:16px; box-shadow:0 4px 10px rgba(0,0,0,0.05); margin-bottom:24px; }
        .filters form { display:grid; gap:12px; grid-template-columns:repeat(12,1fr); align-items:end; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { font-size: .85rem; color:#141B4D; font-weight:600; font-family:'Poppins',sans-serif; }
        .field input, .field select { background:#fff; border:1px solid #E9E9E9; border-radius:8px; padding:10px 12px; font-size:14px; outline:none; transition: box-shadow .15s, border-color .15s; }
        .field input:focus, .field select:focus { border-color:#279989; box-shadow:0 0 0 4px #ECF6F4; }

        .col-6 { grid-column: span 6; }
        .col-3 { grid-column: span 3; }
        .col-12 { grid-column: span 12; }

        .actions { display:flex; gap:12px; justify-content:flex-end; align-items:center; grid-column: span 12; }
        .toggles { display:flex; gap: 12px; align-items:center; margin-right:auto; grid-column: span 12; }
        .badge { display:inline-block; background:#E86A5E; color:#fff; padding:4px 8px; border-radius:6px; font-size:.8rem; font-weight:600; }
        .btn { border:none; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn-secondary { background:#fff; color:#141B4D; border:2px solid #141B4D; }
        .btn-secondary:hover { background:#141B4D; color:#fff; }

        /* Cards */
        .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:24px; }
        .card { position:relative; background:#D6D2C4; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.05); overflow:hidden; display:flex; flex-direction:column; transition:transform .2s, box-shadow .2s; text-decoration:none; }
        .card:hover { transform:scale(1.05); box-shadow:0 8px 20px rgba(0,0,0,0.12); }
        .img-wrap { position:relative; overflow:hidden; }
        .img { width:100%; aspect-ratio:4/3; object-fit:cover; border-bottom:1px solid #E9E9E9; background:#E9E9E9; transition: filter .2s ease, opacity .2s ease; }
        .sold .img { filter: grayscale(1) brightness(0.82) contrast(1.1); opacity: 0.8; }
        .sold .img-wrap::after { content:""; position:absolute; inset:0; background: radial-gradient(transparent, rgba(20,27,77,0.22)); pointer-events:none; }

        /* ★ Soft inside SOLD banner */
        .soldBanner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 10px 18px;
          border-radius: 14px;
          font-family: 'Poppins', sans-serif;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(20,27,77,0.88); /* Storm Blue w/ opacity */
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 10px 24px rgba(20,27,77,0.25);
          backdrop-filter: blur(2px);
          z-index: 2;
        }

        .content { padding:16px; display:flex; flex-direction:column; flex-grow:1; }
        .title { font-family:'Poppins', sans-serif; font-weight:600; color:#141B4D; font-size:1.1rem; margin:0 0 6px; }
        .meta { font-size:.9rem; color:#3A3A3A; margin-bottom:6px; }
        .specs { font-size:.9rem; color:#3A3A3A; display:flex; gap:8px; flex-wrap:wrap; margin-bottom:auto; }
        .specs span:not(:last-child)::after { content:"•"; margin-left:8px; color:#E9E9E9; }
        .price { font-family:'Poppins', sans-serif; font-weight:600; color:#141B4D; font-size:1.05rem; margin-top:12px; }

        .resultbar { display:flex; justify-content:space-between; align-items:center; margin: 12px 4px 20px; color:#3A3A3A; }
        @media (max-width:768px){ .filters form{grid-template-columns:repeat(6,1fr)} .col-6{grid-column:span 6} .col-3{grid-column:span 3} .col-12{grid-column:span 6} .actions{justify-content:stretch}}
        @media (max-width:540px){ .soldBanner{ letter-spacing:.14em; padding:8px 12px; } }
      `}</style>

      <main>
        <h1>Parked Plastic — Disc Listings</h1>
        <p className="sub">Browse used discs. Filter by brand, mold, condition, weight, and price — or search everything.</p>

        <section className="filters" aria-label="Search and filters">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="field col-12">
              <label htmlFor="search">Search</label>
              <input id="search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, brand, mold, plastic, description…" />
            </div>

            <div className="field col-6">
              <label htmlFor="brand">Brand</label>
              <input id="brand" type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Innova, Discraft, MVP…" />
            </div>
            <div className="field col-6">
              <label htmlFor="mold">Mold</label>
              <input id="mold" type="text" value={mold} onChange={(e) => setMold(e.target.value)} placeholder="Destroyer, Buzzz, Hex…" />
            </div>

            <div className="field col-3">
              <label htmlFor="condition">Condition</label>
              <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="">Any</option>
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="field col-3">
              <label htmlFor="minWeight">Min Weight (g)</label>
              <input id="minWeight" type="number" min={120} max={200} placeholder="165" value={minWeight} onChange={(e) => setMinWeight(e.target.value)} />
            </div>
            <div className="field col-3">
              <label htmlFor="maxWeight">Max Weight (g)</label>
              <input id="maxWeight" type="number" min={120} max={200} placeholder="180" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
            </div>

            <div className="field col-3">
              <label htmlFor="minPrice">Min Price (CAD)</label>
              <input id="minPrice" type="number" min={0} step="0.01" placeholder="10.00" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </div>
            <div className="field col-3">
              <label htmlFor="maxPrice">Max Price (CAD)</label>
              <input id="maxPrice" type="number" min={0} step="0.01" placeholder="35.00" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>

            <div className="toggles">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={includeSold} onChange={(e) => setIncludeSold(e.target.checked)} />
                Include sold listings
              </label>
            </div>
            <div className="actions">
              {activeFiltersCount > 0 && <span className="badge">{activeFiltersCount} active</span>}
              <button className="btn btn-secondary" type="button" onClick={resetFilters}>Reset</button>
            </div>
          </form>
        </section>

        <div className="resultbar">
          <div>{loading ? "Loading…" : `${discs.length} result${discs.length === 1 ? "" : "s"}`}</div>
        </div>

        <div className="grid">
          {discs.map((d) => (
            <Link href={`/listings/${d.id}`} key={d.id} className={`card ${d.is_sold ? "sold" : ""}`} aria-label={`View ${d.title}`} title={d.title}>
              <div className="img-wrap">
                {d.image_urls?.length ? (
                  <img className="img" src={d.image_urls[0]} alt={d.title} />
                ) : (
                  <div className="img" aria-label="No image" />
                )}
                {d.is_sold && <div className="soldBanner" aria-label="Sold">SOLD</div>}
              </div>

              <div className="content">
                <h2 className="title">{d.title}</h2>
                <div className="meta">{(d.brand || "—")}{d.mold ? ` • ${d.mold}` : ""}</div>
                <div className="specs">
                  {d.weight && <span>{d.weight} g</span>}
                  {d.condition && <span>{d.condition}</span>}
                </div>
                {d.price != null && <div className="price">${Number(d.price).toFixed(2)}</div>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

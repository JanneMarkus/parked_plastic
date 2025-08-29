// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Poppins, Source_Sans_3 } from "next/font/google";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { getBlurDataURL } from "@/lib/blurClient";
import GlobalStyles from "@/components/GlobalStyles";
import PlaceholderDisc from "@/components/PlaceholderDisc";
import { BRANDS, FEATURED, computeBrandSuggestions } from "@/data/brands";

const supabase = getSupabaseBrowser();

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
  variable: "--font-source",
});

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function useDebouncedValue(value, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function toNum(v, fallback) {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pct(val, min, max) {
  return ((val - min) / (max - min)) * 100;
}

/**
 * DualRange — a two-thumb slider that still supports "unset" (empty string) for either side.
 * Props:
 *  - label, min, max, step
 *  - minState = [value, setter]  (string "" | number-like)
 *  - maxState = [value, setter]
 *  - unit (optional): e.g. "g", "/10"
 */
function DualRange({
  label,
  min,
  max,
  step = 1,
  minState,
  maxState,
  unit = "",
}) {
  const [loVal, setLoVal] = minState;
  const [hiVal, setHiVal] = maxState;

  // Effective numbers for rendering the thumbs (fallback to full span when unset)
  const lo = toNum(loVal, min);
  const hi = toNum(hiVal, max);

  const left = Math.max(min, Math.min(lo, hi));
  const right = Math.min(max, Math.max(hi, lo));

  const leftPct = pct(left, min, max);
  const rightPct = pct(right, min, max);

  const showLeft = loVal !== "";
  const showRight = hiVal !== "";

  const onChangeMin = (e) => {
    const v = Number(e.target.value);
    const clamped = Math.min(v, right);
    setLoVal(String(clamped));
  };
  const onChangeMax = (e) => {
    const v = Number(e.target.value);
    const clamped = Math.max(v, left);
    setHiVal(String(clamped));
  };

  const clear = () => {
    setLoVal("");
    setHiVal("");
  };

  return (
    <div className="pp-field flight">
      <label className="pp-range-label">
        <span>{label}</span>
        <span className="pp-range-readout">
          {showLeft ? left : "Any"} – {showRight ? right : "Any"}
          {unit && (showLeft || showRight) ? unit : ""}
          {(showLeft || showRight) && (
            <button
              type="button"
              className="pp-clear"
              onClick={clear}
              aria-label={`Clear ${label} filter`}
            >
              ×
            </button>
          )}
        </span>
      </label>

      <div
        className="pp-dualrange"
        style={{ "--l": `${leftPct}%`, "--r": `${rightPct}%` }}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={left}
          onChange={onChangeMin}
          aria-label={`${label} min`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={right}
          onChange={onChangeMax}
          aria-label={`${label} max`}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [discs, setDiscs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  // --- Brand autocomplete state & logic (INSIDE Home) ---
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandHighlight, setBrandHighlight] = useState(-1); // keyboard focus index

  const brandSuggestions = useMemo(
    () => computeBrandSuggestions(brand),
    [brand]
  );

  const onBrandFocus = () => setBrandOpen(true);
  const onBrandBlur = () => {
    // close after a tick so click can register
    setTimeout(() => setBrandOpen(false), 80);
  };
  const chooseBrand = (name) => {
    if (name === "Other") {
      setBrand("Other");
    } else {
      setBrand(name);
    }
    setBrandOpen(false);
    setBrandHighlight(-1);
  };
  const onBrandKeyDown = (e) => {
    if (!brandOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setBrandOpen(true);
      return;
    }
    if (!brandOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setBrandHighlight((i) => Math.min(i + 1, brandSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setBrandHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (brandHighlight >= 0 && brandHighlight < brandSuggestions.length) {
        e.preventDefault();
        chooseBrand(brandSuggestions[brandHighlight]);
      }
    } else if (e.key === "Escape") {
      setBrandOpen(false);
      setBrandHighlight(-1);
    }
  };

  const [mold, setMold] = useState("");
  const [minCondition, setMinCondition] = useState("");
  const [maxCondition, setMaxCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [includePending, setIncludePending] = useState(false);
  const [onlyGlow, setOnlyGlow] = useState(false);
  const [excludeInked, setExcludeInked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [speedMin, setSpeedMin] = useState("");
  const [speedMax, setSpeedMax] = useState("");
  const [glideMin, setGlideMin] = useState("");
  const [glideMax, setGlideMax] = useState("");
  const [turnMin, setTurnMin] = useState("");
  const [turnMax, setTurnMax] = useState("");
  const [fadeMin, setFadeMin] = useState("");
  const [fadeMax, setFadeMax] = useState("");

  // NEW: Disc Type toggles
  const [typeDriver, setTypeDriver] = useState(false);
  const [typeFairway, setTypeFairway] = useState(false);
  const [typeMidrange, setTypeMidrange] = useState(false);
  const [typePutter, setTypePutter] = useState(false);

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
          .select(
            "id,title,brand,mold,weight,condition,price,status,image_urls,created_at,speed,glide,turn,fade,is_inked,is_glow,plastic,description"
          )
          .order("created_at", { ascending: false });

        // Status filter: exclude pending unless toggled in
        if (!includePending) query = query.neq("status", "pending");

        if (onlyGlow) query = query.eq("is_glow", true);
        if (excludeInked) query = query.neq("is_inked", true); // includes NULL + false

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

        const brandClean = brand.trim();
        if (brandClean) {
          if (brandClean.toLowerCase() === "other") {
            // “Other” = anything NOT in the BRANDS list
            // (keeps null/empty brands, which are also “not in list”)
            query = query.not(
              "brand",
              "in",
              `(${BRANDS.map((b) => `"${b.replace(/"/g, '\\"')}"`).join(",")})`
            );
          } else {
            // Normal brand filter (case-insensitive)
            query = query.ilike("brand", brandClean);
          }
        }

        if (mold.trim()) {
          query = query.ilike("mold", mold.trim());
        }

        const minC = minCondition !== "" ? Number(minCondition) : null;
        const maxC = maxCondition !== "" ? Number(maxCondition) : null;
        if (minC !== null && !Number.isNaN(minC))
          query = query.gte("condition", minC);
        if (maxC !== null && !Number.isNaN(maxC))
          query = query.lte("condition", maxC);

        const minP = minPrice !== "" ? Number(minPrice) : null;
        const maxP = maxPrice !== "" ? Number(maxPrice) : null;
        if (minP !== null && !Number.isNaN(minP))
          query = query.gte("price", minP);
        if (maxP !== null && !Number.isNaN(maxP))
          query = query.lte("price", maxP);

        const minW = minWeight !== "" ? Number(minWeight) : null;
        const maxW = maxWeight !== "" ? Number(maxWeight) : null;
        if (minW !== null && !Number.isNaN(minW))
          query = query.gte("weight", minW);
        if (maxW !== null && !Number.isNaN(maxW))
          query = query.lte("weight", maxW);

        // Flight ranges
        const rng = (val) => (val !== "" && val !== null ? Number(val) : null);
        const sMin = rng(speedMin),
          sMax = rng(speedMax);
        const gMin = rng(glideMin),
          gMax = rng(glideMax);
        const tMin = rng(turnMin),
          tMax = rng(turnMax);
        const fMin = rng(fadeMin),
          fMax = rng(fadeMax);
        if (sMin !== null && !Number.isNaN(sMin))
          query = query.gte("speed", sMin);
        if (sMax !== null && !Number.isNaN(sMax))
          query = query.lte("speed", sMax);
        if (gMin !== null && !Number.isNaN(gMin))
          query = query.gte("glide", gMin);
        if (gMax !== null && !Number.isNaN(gMax))
          query = query.lte("glide", gMax);
        if (tMin !== null && !Number.isNaN(tMin))
          query = query.gte("turn", tMin);
        if (tMax !== null && !Number.isNaN(tMax))
          query = query.lte("turn", tMax);
        if (fMin !== null && !Number.isNaN(fMin))
          query = query.gte("fade", fMin);
        if (fMax !== null && !Number.isNaN(fMax))
          query = query.lte("fade", fMax);

        // NEW: Disc Type filters (by speed ranges)
        // Putter: 0–3, Midrange: 4–5, Fairway: 6–9, Driver: 10–15
        const typeClauses = [];
        if (typePutter) typeClauses.push("and(speed.gte.0,speed.lte.3)");
        if (typeMidrange) typeClauses.push("and(speed.gte.4,speed.lte.5)");
        if (typeFairway) typeClauses.push("and(speed.gte.6,speed.lte.9)");
        if (typeDriver) typeClauses.push("and(speed.gte.10,speed.lte.15)");
        if (typeClauses.length > 0) {
          query = query.or(typeClauses.join(","));
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setDiscs(data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
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
    brand,
    mold,
    minCondition,
    maxCondition,
    minPrice,
    maxPrice,
    minWeight,
    maxWeight,
    speedMin,
    speedMax,
    glideMin,
    glideMax,
    turnMin,
    turnMax,
    fadeMin,
    fadeMax,
    includePending,
    onlyGlow,
    excludeInked,
    typeDriver,
    typeFairway,
    typeMidrange,
    typePutter,
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
      const entries = await Promise.all(
        candidates.map(async (src) => [src, await getBlurDataURL(src)])
      );
      setBlurs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      prefetchingRef.current = false;
    })();
  }, [discs, blurs]);

  const activeFiltersCount = useMemo(() => {
    const basics = [
      brand.trim(),
      mold.trim(),
      minCondition !== "" ? "cMin" : "",
      maxCondition !== "" ? "cMax" : "",
      minPrice !== "" ? "minPrice" : "",
      maxPrice !== "" ? "maxPrice" : "",
      minWeight !== "" ? "minWeight" : "",
      maxWeight !== "" ? "maxWeight" : "",
      includePending ? "includePending" : "",
      onlyGlow ? "onlyGlow" : "",
      excludeInked ? "excludeInked" : "",
      debouncedSearch.trim() ? "q" : "",
      // NEW: types
      typeDriver || typeFairway || typeMidrange || typePutter ? "types" : "",
    ];
    const flight = [
      speedMin !== "" ? "sMin" : "",
      speedMax !== "" ? "sMax" : "",
      glideMin !== "" ? "gMin" : "",
      glideMax !== "" ? "gMax" : "",
      turnMin !== "" ? "tMin" : "",
      turnMax !== "" ? "tMax" : "",
      fadeMin !== "" ? "fMin" : "",
      fadeMax !== "" ? "fMax" : "",
    ];
    return [...basics, ...flight].filter(Boolean).length;
  }, [
    brand,
    mold,
    minCondition,
    maxCondition,
    minPrice,
    maxPrice,
    minWeight,
    maxWeight,
    speedMin,
    speedMax,
    glideMin,
    glideMax,
    turnMin,
    turnMax,
    fadeMin,
    fadeMax,
    debouncedSearch,
    includePending,
    typeDriver,
    typeFairway,
    typeMidrange,
    typePutter,
  ]);

  function resetFilters() {
    setSearch("");
    setBrand("");
    setMold("");
    setMinCondition("");
    setMaxCondition("");
    setMinPrice("");
    setMaxPrice("");
    setMinWeight("");
    setMaxWeight("");
    setSpeedMin("");
    setSpeedMax("");
    setGlideMin("");
    setGlideMax("");
    setTurnMin("");
    setTurnMax("");
    setFadeMin("");
    setFadeMax("");
    setIncludePending(false);
    setOnlyGlow(false);
    setExcludeInked(false);
    setTypeDriver(false);
    setTypeFairway(false);
    setTypeMidrange(false);
    setTypePutter(false);
  }

  return (
    <>
      <Head>
        <title>Parked Plastic — Local Disc Listings</title>
        <meta
          name="description"
          content="Browse used disc golf listings. Filter by brand, mold, condition, weight, price, type — or search everything."
        />
      </Head>

      <GlobalStyles />

      <main className={`${poppins.variable} ${sourceSans.variable} pp-wrap`}>
        <h1 className="pageTitle">Parked Plastic — Local Disc Listings</h1>
        <p className="sub">
          Browse used discs. Search everything, or expand filters for finer
          control.
        </p>

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
                  <span
                    className="pp-badge pp-badge--coral"
                    aria-label={`${activeFiltersCount} active filters`}
                  >
                    {activeFiltersCount} active
                  </span>
                )}
                {activeFiltersCount > 0 && (
                  <button
                    className="pp-btn pp-btn--secondary"
                    type="button"
                    onClick={resetFilters}
                  >
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
                <div className="pp-field pp-autocomplete">
                  <label htmlFor="brand">Brand</label>
                  <input
                    id="brand"
                    className="pp-input"
                    type="text"
                    value={brand}
                    onChange={(e) => { setBrand(e.target.value); setBrandOpen(true); }}
                    onFocus={onBrandFocus}
                    onBlur={onBrandBlur}
                    onKeyDown={onBrandKeyDown}
                    aria-autocomplete="list"
                    aria-expanded={brandOpen ? "true" : "false"}
                    aria-controls="brand-listbox"
                    placeholder="Innova, Discraft, MVP…"
                    autoComplete="off"
                  />
                  {brandOpen && brandSuggestions.length > 0 && (
                    <ul
                      id="brand-listbox"
                      role="listbox"
                      className="pp-suggest"
                      aria-label="Brand suggestions"
                    >
                      {brandSuggestions.map((name, i) => (
                        <li
                          key={name}
                          role="option"
                          aria-selected={i === brandHighlight}
                          className={`pp-suggest-item ${i === brandHighlight ? "is-active" : ""}`}
                          onMouseDown={(e) => e.preventDefault()}  // keep focus
                          onClick={() => chooseBrand(name)}
                          onMouseEnter={() => setBrandHighlight(i)}
                        >
                          {name}
                          {FEATURED.includes(name)}
                        </li>
                      ))}
                    </ul>
                  )}
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

                {/* NEW: Disc Type chips */}
                <div className="pp-field">
                  <label>Disc Type</label>
                  <div className="chips">
                    <button
                      type="button"
                      className={`chip ${typeDriver ? "is-active" : ""}`}
                      onClick={() => setTypeDriver((v) => !v)}
                      aria-pressed={typeDriver ? "true" : "false"}
                    >
                      Driver
                    </button>
                    <button
                      type="button"
                      className={`chip ${typeFairway ? "is-active" : ""}`}
                      onClick={() => setTypeFairway((v) => !v)}
                      aria-pressed={typeFairway ? "true" : "false"}
                    >
                      Fairway
                    </button>
                    <button
                      type="button"
                      className={`chip ${typeMidrange ? "is-active" : ""}`}
                      onClick={() => setTypeMidrange((v) => !v)}
                      aria-pressed={typeMidrange ? "true" : "false"}
                    >
                      Midrange
                    </button>
                    <button
                      type="button"
                      className={`chip ${typePutter ? "is-active" : ""}`}
                      onClick={() => setTypePutter((v) => !v)}
                      aria-pressed={typePutter ? "true" : "false"}
                    >
                      Putter
                    </button>
                  </div>
                  <p className="hintRow">Based on speed: Putter 0–3 • Mid 4–5 • Fairway 6–9 • Driver 10–15</p>
                </div>

                {/* Sleepy Scale (Condition) */}
                <DualRange
                  label="Condition (Sleepy Scale)"
                  min={1}
                  max={10}
                  step={1}
                  minState={[minCondition, setMinCondition]}
                  maxState={[maxCondition, setMaxCondition]}
                  unit="/10"
                />

                {/* Weight (g) */}
                <DualRange
                  label="Weight"
                  min={100}
                  max={200}
                  step={1}
                  minState={[minWeight, setMinWeight]}
                  maxState={[maxWeight, setMaxWeight]}
                  unit=" g"
                />

                {/* ===== Flight number range sliders ===== */}
                <DualRange
                  label="Speed"
                  min={1}
                  max={15}
                  step={0.5}
                  minState={[speedMin, setSpeedMin]}
                  maxState={[speedMax, setSpeedMax]}
                />
                <DualRange
                  label="Glide"
                  min={1}
                  max={7}
                  step={0.5}
                  minState={[glideMin, setGlideMin]}
                  maxState={[glideMax, setGlideMax]}
                />
                <DualRange
                  label="Turn"
                  min={-5}
                  max={1} // NOTE: capped at +1
                  step={0.5}
                  minState={[turnMin, setTurnMin]}
                  maxState={[turnMax, setTurnMax]}
                />
                <DualRange
                  label="Fade"
                  min={0}
                  max={6}
                  step={0.5}
                  minState={[fadeMin, setFadeMin]}
                  maxState={[fadeMax, setFadeMax]}
                />

                <div className="pp-field">
                  <label>Price (CAD)</label>
                  <div className="row">
                    <input
                      id="minPrice"
                      className="pp-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      inputMode="decimal"
                      aria-label="Minimum price"
                    />
                    <input
                      id="maxPrice"
                      className="pp-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      inputMode="decimal"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>

                <div className="toggles">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={includePending}
                      onChange={(e) => setIncludePending(e.target.checked)}
                    />
                    Include pending listings
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={onlyGlow}
                      onChange={(e) => setOnlyGlow(e.target.checked)}
                    />
                    Show only Glow discs
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={excludeInked}
                      onChange={(e) => setExcludeInked(e.target.checked)}
                    />
                    Exclude Inked discs
                  </label>
                </div>
              </div>
            )}
          </form>
        </section>

        <div className="resultbar" aria-live="polite" aria-atomic="true">
          <div>
            {loading
              ? "Loading…"
              : `${discs.length} result${discs.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Cards — match Account page look & feel */}
        <div className="grid-cards" aria-busy={loading ? "true" : "false"}>
          {discs.map((d, idx) => {
            const src = d.image_urls?.[0];
            const hasImage = !!src;
            const price =
              d.price != null && Number.isFinite(Number(d.price))
                ? CAD.format(Number(d.price))
                : null;

            const isSold = d.status === "sold";
            const isPending = d.status === "pending";

            return (
              <Link
                href={`/listings/${d.id}`}
                key={d.id}
                className={`pp-card listing-card ${isSold ? "is-sold" : isPending ? "is-pending" : ""}`}
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
                    <PlaceholderDisc className="img placeholder" />
                  )}
                  {isSold && <div className="soldBanner">SOLD</div>}
                  {isPending && <div className="pendingBanner">PENDING</div>}
                </div>

                <div className="content">
                  <h2 className="cardTitle">{d.title}</h2>
                  {/* Flight numbers compact line */}
                  {d.speed != null &&
                    d.glide != null &&
                    d.turn != null &&
                    d.fade != null && (
                      <div className="flightline" aria-label="Flight numbers">
                        {d.speed} / {d.glide} / {d.turn} / {d.fade}
                      </div>
                    )}
                  <div className="meta">
                    {d.brand || "—"}
                    {d.mold ? ` • ${d.mold}` : ""}
                  </div>
                  <div className="specs">
                    {d.weight && <span>{d.weight} g</span>}
                    {d.is_glow && <span>Glow</span>}
                    {d.condition != null && <span>{d.condition}/10</span>}
                    {d.is_inked && <span>Inked</span>}
                  </div>
                  {price && (
                    <div className="price pp-badge pp-badge--teal">{price}</div>
                  )}
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

        /* Two-input rows (sliders & ranges) */
        .pp-field .row {
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

        /* Chips */
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
        }
        .chip {
          border: 1px solid var(--cloud);
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        }
        .chip.is-active {
          background: var(--tint, #ecf6f4);
          border-color: var(--teal, #279989);
          box-shadow: 0 0 0 2px rgba(39, 153, 137, 0.15) inset;
        }
        .hintRow {
          color: #666;
          font-size: .85rem;
          margin-top: 4px;
        }

        /* ===== Cards (Account parity + small hover polish) ===== */
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .listing-card {
          position: relative;
          overflow: hidden;
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
          border-radius: var(--radius)  var(--radius) 0 0;
        }
        .img {
          transition: transform 0.25s ease;
        }
        .listing-card:hover .img {
          transform: scale(1.05);
        }

        /* Sold & pending visual treatments */
        .listing-card.is-sold .img,
        .listing-card.is-pending .img {
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

        /* Autocomplete */
        .pp-autocomplete { position: relative; }
        .pp-suggest {
          position: absolute;
          z-index: 40;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid var(--cloud);
          border-radius: 10px;
          box-shadow: 0 10px 24px rgba(0,0,0,.08);
          padding: 6px;
          max-height: 280px;
          overflow: auto;
        }
        .pp-suggest-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          user-select: none;
          font-size: 14px;
        }
        .pp-suggest-item:hover,
        .pp-suggest-item.is-active {
          background: #f7fbfa;
        }
        .pp-suggest .pill {
          font-size: 11px;
          border: 1px solid var(--cloud);
          padding: 2px 6px;
          border-radius: 999px;
          color: var(--storm);
          background: #fff;
        }

        .img.placeholder {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </>
  );
}

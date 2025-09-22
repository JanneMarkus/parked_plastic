// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Poppins, Source_Sans_3 } from "next/font/google";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { getBlurDataURL } from "@/lib/blurClient";
import GlobalStyles from "@/components/GlobalStyles";
import PlaceholderDisc from "@/components/PlaceholderDisc";
import { BRANDS, FEATURED_COUNT } from "@/data/brands";
import { useToast } from "@/components/ToastProvider";
import BrandAutocomplete from "@/components/BrandAutocomplete";

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
  const router = useRouter();
  const [discs, setDiscs] = useState([]);
  const [loading, setLoading] = useState(false);
  // Map of seller IDs to names for cards
  const [sellerNames, setSellerNames] = useState({});

  // NEW: seller filter state (from ?seller)
  const [sellerName, setSellerName] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [seller, setSeller] = useState(""); // profiles.id from ?seller=
  const [brand, setBrand] = useState("");
  // --- Brand autocomplete state & logic (INSIDE Home) ---

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
  // Branded toasts + Jump-to-results
  const toast = useToast();
  const firstLoadRef = useRef(true);

  const resultsRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 450);

  // --- Strict-Mode safety helpers ---
  // Guards against stale results when multiple fetches overlap
  const requestIdRef = useRef(0);

  async function onInviteFriend() {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";

    let url = base || "/";

    try {
      const res = await fetch("/api/referral-code", { credentials: "include" });
      const { code } = await res.json();
      if (code) url = `${base}/r/${code}`;
    } catch {
      // swallow; we'll share the homepage
    }

    const text = "Got discs to sell? Post them on Parked Plastic.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Parked Plastic", text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied to clipboard!", { duration: 2000 });
      } else {
        // very old browsers
        window.prompt("Copy your invite link:", url);
      }
    } catch {
      // user canceled share — no-op
    }
  }

  // Fetch seller display name for tag
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!seller) {
        setSellerName("");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", seller)
        .maybeSingle();
      if (!cancelled) {
        setSellerName(data?.full_name || "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seller]);

  // Sync seller filter from the query string (?seller=<profileId>)
  useEffect(() => {
    const qsSeller = router.query?.seller;
    setSeller(typeof qsSeller === "string" ? qsSeller : "");
  }, [router.query?.seller]);

  // Strict-Mode-safe data fetch effect
  useEffect(() => {
    const myRequestId = ++requestIdRef.current;
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("discs")
          .select(
            "id,title,brand,mold,weight,condition,price,status,image_urls,created_at,speed,glide,turn,fade,is_inked,is_glow,plastic,description, owner"
          )
          .order("created_at", { ascending: false });

        // Attach abort signal if the client supports it (supabase-js v2)
        if (typeof query.abortSignal === "function") {
          query = query.abortSignal(ctrl.signal);
        }

        // Status filter: exclude pending unless toggled in
        if (!includePending) query = query.neq("status", "pending");

        if (onlyGlow) query = query.eq("is_glow", true);
        if (excludeInked) query = query.neq("is_inked", true); // includes NULL + false

        // Seller filter (profiles.id stored in discs.owner)
        if (seller.trim()) {
          query = query.eq("owner", seller.trim());
        }

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

        // Ignore if this response is stale or component unmounted
        if (cancelled || myRequestId !== requestIdRef.current) return;

        if (error) throw error;
        setDiscs(data || []);
      } catch (e) {
        if (cancelled || myRequestId !== requestIdRef.current) return;
        // eslint-disable-next-line no-console
        console.error(e);
        setDiscs([]);
      } finally {
        if (cancelled || myRequestId !== requestIdRef.current) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        ctrl.abort();
      } catch {}
    };
  }, [
    debouncedSearch,
    seller,
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

  // Branded toast after result changes (only when filters drawer is open)
  useEffect(() => {
    if (!showFilters) return; // <-- don't toast if drawer is closed
    if (loading) return;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    const id = toast.info(
      `Listings updated — ${discs.length} result${
        discs.length === 1 ? "" : "s"
      }`,
      { duration: 1600 }
    );

    // If something re-renders fast or drawer closes, best-effort dismiss
    return () => {
      try {
        toast.dismiss?.(id);
      } catch {}
    };
  }, [loading, discs.length, toast, showFilters]);

  // Show "Jump to results" ONLY when results grid is sufficiently visible AND drawer is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = resultsRef.current;
    if (!el) return;

    // If drawer is closed, ensure FAB is hidden and skip observer
    if (!showFilters) {
      setShowJump(false);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShowJump(true);
      return;
    }

    let obs;
    const setup = () => {
      const isSmall = window.matchMedia("(max-width: 640px)").matches;
      const HEADER_OFFSET_PX = 120; // match header height
      const VISIBLE_VH = isSmall ? 0.55 : 0.45;

      obs?.disconnect();
      obs = new IntersectionObserver(
        ([entry]) => {
          const visiblePortionOfViewport =
            entry.intersectionRect.height / window.innerHeight;
          const sufficientlyVisible =
            entry.isIntersecting && visiblePortionOfViewport >= VISIBLE_VH;
          setShowJump(!sufficientlyVisible);
        },
        {
          root: null,
          rootMargin: `-${HEADER_OFFSET_PX}px 0px 0px 0px`,
          threshold: [0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1],
        }
      );
      obs.observe(el);
    };

    setup();
    window.addEventListener("resize", setup);
    window.addEventListener("orientationchange", setup);
    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", setup);
      window.removeEventListener("orientationchange", setup);
    };
  }, [showFilters]); // <-- re-run when drawer opens/closes

  const onJumpToResults = () => {
    const el = resultsRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      window.location.hash = "#results";
    }
    // Prevent focus from causing a second, unwanted scroll
    requestAnimationFrame(() => {
      try {
        el.focus?.({ preventScroll: true });
      } catch {
        el.focus?.();
      }
    });
  };

  // Fetch seller display names for the cards, in a single batched query
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const owners = Array.from(
        new Set((discs || []).map((d) => d.owner).filter(Boolean))
      );
      if (owners.length === 0) {
        if (!cancelled) setSellerNames({});
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", owners);
        if (!cancelled) {
          setSellerNames(
            Object.fromEntries(
              (data || []).map((p) => [p.id, p.full_name || "Seller"])
            )
          );
        }
      } catch {
        if (!cancelled) setSellerNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discs, supabase]);

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
      seller.trim() ? "seller" : "",
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
    seller,
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
    setSeller("");
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
    if (router.query && "seller" in router.query) {
      const { seller: _omit, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, {
        shallow: true,
      });
    }
  }

  // ---- Helpers for card visuals ----
  function conditionClass(cond) {
    if (cond == null) return "";
    const n = Number(cond);
    if (!Number.isFinite(n)) return "";
    if (n >= 7) return "cond--good"; // 7–10 = Green
    if (n >= 5) return "cond--warn"; // 5–7  = Yellow
    return "cond--bad"; // ≤4   = Red
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
                {seller && sellerName && (
                  <span className="pp-badge pp-badge--teal">
                    Showing {sellerName}&apos;s listings
                  </span>
                )}
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
                <BrandAutocomplete
                  label="Brand"
                  id="brand"
                  value={brand}
                  onChange={setBrand}
                  list={BRANDS}
                  featuredCount={FEATURED_COUNT}
                  includeOther={true} // search mode => include “Other”
                />

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

                {/* Disc Type chips */}
                <div className="pp-field">
                  <label>Disc Type</label>
                  <div className="chips">
                    <button
                      type="button"
                      className={`chip ${typePutter ? "is-active" : ""}`}
                      onClick={() => setTypePutter((v) => !v)}
                      aria-pressed={typePutter ? "true" : "false"}
                    >
                      Putter
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
                      className={`chip ${typeFairway ? "is-active" : ""}`}
                      onClick={() => setTypeFairway((v) => !v)}
                      aria-pressed={typeFairway ? "true" : "false"}
                    >
                      Fairway
                    </button>
                    <button
                      type="button"
                      className={`chip ${typeDriver ? "is-active" : ""}`}
                      onClick={() => setTypeDriver((v) => !v)}
                      aria-pressed={typeDriver ? "true" : "false"}
                    >
                      Driver
                    </button>
                  </div>
                  <p className="hintRow">
                    Based on speed: Putter 0–3 • Mid 4–5 • Fairway 6–9 • Driver
                    10–15
                  </p>
                </div>

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

                {/* Flight number range sliders */}
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

        {/* Cards */}
        <div
          ref={resultsRef}
          id="results"
          tabIndex={-1}
          className="grid-cards"
          aria-busy={loading ? "true" : "false"}
        >
          {discs.map((d, idx) => {
            const src = d.image_urls?.[0];
            const hasImage = !!src;
            const price =
              d.price != null && Number.isFinite(Number(d.price))
                ? CAD.format(Number(d.price))
                : null;

            const isSold = d.status === "sold";
            const isPending = d.status === "pending";
            const condClass = conditionClass(d.condition);

            return (
              <Link
                href={`/listings/${d.id}`}
                key={d.id}
                className={`pp-card listing-card ${
                  isSold ? "is-sold" : isPending ? "is-pending" : ""
                }`}
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

                  {/* Over-image pills */}
                  {price && (
                    <span className="pp-pill pill--price" aria-label="Price">
                      {price}
                    </span>
                  )}
                  {d.condition != null && (
                    <span
                      className={`pp-pill pill--cond ${condClass}`}
                      aria-label={`Condition ${d.condition}/10`}
                    >
                      {d.condition}/10
                    </span>
                  )}

                  {isSold && <div className="soldBanner">SOLD</div>}
                  {isPending && <div className="pendingBanner">PENDING</div>}
                </div>

                <div className="content">
                  <h2 className="cardTitle">{d.title}</h2>

                  {/* Seller name row with reserved space */}
                  <div className="sellerLine">
                    {d.owner && sellerNames[d.owner] ? (
                      <button
                        type="button"
                        className="asLink"
                        title={`View ${sellerNames[d.owner]}'s listings`}
                        aria-label={`View ${sellerNames[d.owner]}'s listings`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSeller(d.owner);
                          router.replace(
                            {
                              pathname: router.pathname,
                              query: { ...router.query, seller: d.owner },
                            },
                            undefined,
                            { shallow: true }
                          );
                        }}
                      >
                        {sellerNames[d.owner]}
                      </button>
                    ) : (
                      <span className="sellerPlaceholder">&nbsp;</span>
                    )}
                  </div>

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
                    {d.is_inked && <span>Inked</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {/* End-of-list CTAs */}
        <section className="endCta" aria-label="End of listings">
          <p className="endText">
            That’s all for now — help grow the marketplace!
          </p>
          <div className="endActions">
            <Link href="/create-listing" className="pp-btn">
              Post a Disc
            </Link>
            <button
              type="button"
              className="pp-btn pp-btn--secondary"
              onClick={onInviteFriend}
            >
              Invite a Friend
            </button>
          </div>
        </section>

        {/* Floating Jump-to-results button (animated show/hide) */}
        <button
          type="button"
          className={`pp-fab ${showJump && showFilters ? "is-visible" : ""}`}
          onClick={onJumpToResults}
          aria-controls="results"
          aria-label="Jump to results"
          aria-hidden={showJump && showFilters ? "false" : "true"}
          tabIndex={showJump && showFilters ? 0 : -1}
          accessKey="r"
          title="Jump to results (Alt/Option+Shift+R)"
        >
          Jump to results
        </button>
      </main>

      {/* Page-scoped styles that complement GlobalStyles (layout polish) */}
      <style jsx>{`
        .pp-wrap {
          padding-bottom: 80px;
        }
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
          font-size: 0.85rem;
          margin-top: 4px;
        }

        /* Autocomplete */
        .pp-autocomplete {
          position: relative;
        }
        .pp-suggest {
          position: absolute;
          z-index: 40;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid var(--cloud);
          border-radius: 10px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
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

        .endCta {
          margin: 20px 0 0;
          padding: 16px;

          border-radius: var(--radius);
          background: var(--sea);
          text-align: center;
        }
        .endText {
          margin: 0 0 10px;
          color: var(--storm);
          font-weight: 700;
        }
        .endActions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* Reserve space for seller names to prevent layout shift */
        .sellerLine {
          min-height: 1.5em; /* matches one line of text */
        }
        .sellerPlaceholder {
          display: inline-block;
          width: 100%;
          height: 1.5em;
        }

        /* Condition pill base */
        .pill--cond {
          font-weight: 700;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        /* 8–10 (Green) */
        .pill--cond.cond--good {
          background: #2e7d32; /* accessible green */
          color: #fff;
          border-color: rgba(0, 0, 0, 0.12);
        }

        /* 5–7 (Yellow) */
        .pill--cond.cond--warn {
          background: #f6c445; /* warm yellow/amber */
          color: #3a3a3a; /* dark text for contrast */
          border-color: rgba(0, 0, 0, 0.12);
        }

        /* ≤4 (Red) */
        .pill--cond.cond--bad {
          background: #d64545; /* accessible red */
          color: #fff;
          border-color: rgba(0, 0, 0, 0.12);
        }

        /* Floating action button: Jump to results (on-brand) */
        .pp-fab {
          position: fixed;
          left: 50%;
          /* Hidden/base state: centered X, offset 12px down for slide-in */
          transform: translate(-50%, 12px);
          /* Lift the FAB above any visible toasts + safe area */
          bottom: calc(
            14px + var(--toast-stack-height, 0px) +
              env(safe-area-inset-bottom, 0px)
          );
          z-index: 1001;

          border: none;
          background: var(--teal, #279989); /* brand teal */
          color: #fff;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18),
            0 2px 0 rgba(0, 0, 0, 0.02) inset;
          border-radius: 999px;
          padding: 12px 18px 12px 44px; /* extra left for icon */
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.2px;
          cursor: pointer;

          opacity: 0;
          pointer-events: none;

          /* One transition list; avoid duplicate transform declarations elsewhere */
          transition: opacity 160ms ease, transform 160ms ease,
            background 120ms ease, box-shadow 120ms ease;
        }

        .pp-fab.is-visible {
          opacity: 1;
          transform: translate(-50%, 0); /* centered and visible */
          pointer-events: auto;
        }

        .pp-fab::before {
          content: "";
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
        }

        .pp-fab::after {
          /* Down chevron using currentColor (white) */
          content: "";
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: center;
        }

        .pp-fab:hover {
          background: var(--teal-dark, #1e7a6f);
          transform: translate(
            -50%,
            -1px
          ); /* slight lift while staying centered */
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(0, 0, 0, 0.04) inset;
        }

        .pp-fab:active {
          transform: translate(-50%, 0); /* settle back on press */
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18),
            0 1px 0 rgba(0, 0, 0, 0.04) inset;
        }

        .pp-fab:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--teal, #279989),
            0 10px 24px rgba(0, 0, 0, 0.18);
        }

        @media (prefers-reduced-motion: reduce) {
          .pp-fab {
            transition: none;
          }
        }

        @media (prefers-color-scheme: dark) {
          .pp-fab {
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.36),
              0 2px 0 rgba(255, 255, 255, 0.03) inset;
          }
        }

        /* Ensure anchored scrolls don't hide under the header */
        #results {
          scroll-margin-top: 120px; /* set to your header height */
        }
        @media (min-width: 768px) {
          #results {
            scroll-margin-top: 120px; /* if header is taller on desktop */
          }
        }
      `}</style>
    </>
  );
}

// data/brands-molds.js

// How many from the top are “featured”
export const FEATURED_COUNT = 30;

// Ordered entries: brand -> popular molds
export const BRAND_ENTRIES = [
  ["Axiom", ["Hex","Envy", "Proxy", "Crave", "Insanity", "Fireball", "Defy", "Tempo", "Mayhem"]],
  ["Discmania", ["PD", "FD", "DD3", "P2", "MD3", "Essence", "Instinct", "Origin", "Tilt"]],
  ["Discraft", ["Buzzz", "Zone", "Force", "Undertaker", "Nuke", "Luna", "Challenger", "Crank", "Comet", "Heat"]],
  ["Dynamic Discs", ["Judge", "EMAC Truth", "Trespass", "Felon", "Escape", "Warden", "Raider", "Maverick", "Vandal"]],
  ["Gateway", ["Wizard", "Warlock", "Magic", "Chief", "Apache"]],
  ["Infinite Discs", ["Emperor", "Pharaoh", "Sphinx", "Tomb", "Aztec", "Centurion", "Dynasty", "Exodus", "Rift"]],
  ["Innova", ["Destroyer", "Wraith", "Teebird", "Firebird", "Aviar", "Mako3", "Roc3", "Leopard3", "Tern", "Thunderbird"]],
  ["Kastaplast", ["Berg", "Reko", "Lots", "Stal", "Grym", "Gote", "Kaxe", "Krut", "Falk", "Jarn"]],
  ["Latitude 64", ["Pure", "Diamond", "River", "Saint", "Grace", "Ballista Pro", "Fuse", "Pioneer", "Explorer"]],
  ["MVP", ["Trail", "Wave", "Volt", "Tesla", "Reactor", "Nomad", "Catalyst", "Photon", "Relay", "Inertia"]],
  ["Prodigy", ["PA-3", "M4", "F5", "D3", "H3", "A2", "FX-2", "D2", "PX-3", "M3"]],
  ["Streamline", ["Pilot", "Drift", "Trace", "Lift", "Runway"]],
  ["Westside Discs", ["Harp", "Warship", "Sword", "Queen", "Stag", "Hatchet", "Pine", "Anvil"]],
  // The rest — add as you go. Empty arrays are fine; suggestions still allow free text.
  ["DGA", []],
  ["Clash Discs", []],
  ["Thought Space Athletics", []],
  ["Lone Star Discs", []],
  ["Mint Discs", []],
  ["RPM Discs", []],
  ["Prodiscus", []],
  ["Divergent Discs", []],
  ["Disc Golf UK", []],
  ["Loft Discs", []],
  ["Viking Discs", []],
  ["Birdie", []],
  ["Doomsday Discs", []],
  ["Doombird", []],
  ["Millennium", []],
  ["Alpha Discs", []],
  ["EV-7", []],
];

// Derived structures/utilities (no duplication)
export const BRANDS_MAP = Object.fromEntries(BRAND_ENTRIES);
export const BRANDS = BRAND_ENTRIES.map(([brand]) => brand);
export const FEATURED = BRANDS.slice(0, FEATURED_COUNT);

export function getMoldsForBrand(brand) {
  return BRANDS_MAP[brand] || [];
}

// Same suggestion logic, now using BRANDS derived from the single source
export function computeBrandSuggestions(
  input,
  list = BRANDS,
  featuredCount = FEATURED_COUNT,
  includeOther = true,
) {
  const q = (input || "").trim().toLowerCase();
  const featured = list.slice(0, featuredCount);
  if (!q) return [...featured, "Other"];

  const starts = list.filter((b) => b.toLowerCase().startsWith(q));
  const contains = list.filter(
    (b) => !starts.includes(b) && b.toLowerCase().includes(q)
  );

  const topStarts = starts.filter((b) => featured.includes(b));
  const restStarts = starts.filter((b) => !featured.includes(b));
  const topContains = contains.filter((b) => featured.includes(b));
  const restContains = contains.filter((b) => !featured.includes(b));

  const uniq = (arr) => Array.from(new Set(arr));
  const results = uniq([
    ...topStarts,
    ...restStarts,
    ...topContains,
    ...restContains,
  ]).slice(0, 12);

  return includeOther ? [...results, "Other"]: results;
}

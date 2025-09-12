// A single list. Put your “top” brands first—those first N are treated as featured.
export const BRANDS = [
  // (Top / featured first — adjust freely)
  "Axiom",
  "Discmania",
  "Discraft",
  "Dynamic Discs",
  "Gateway",
  "Infinite Discs",
  "Innova",
  "Kastaplast",
  "Latitude 64",
  "MVP",
  "Prodigy",
  "Streamline",
  "Westside Discs",

  // (The rest — order however you like)
  "DGA",
  "Clash Discs",
  "Thought Space Athletics",
  "Lone Star Discs",
  "Mint Discs",
  "RPM Discs",
  "Prodiscus",
  "Divergent Discs",
  "Disc Golf UK",
  "Loft Discs",
  "Viking Discs",
  "Birdie",
  "Doomsday Discs",
  "Doombird",
  "Millennium",
  "Alpha Discs",
  "EV-7",
];

// How many from the top of BRANDS are “featured”
export const FEATURED_COUNT = 30;
export const FEATURED = BRANDS.slice(0, FEATURED_COUNT);

// Same suggestion logic, now using just BRANDS and FEATURED order.
export function computeBrandSuggestions(
  input,
  list = BRANDS,
  featuredCount = FEATURED_COUNT
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

  return [...results, "Other"];
}

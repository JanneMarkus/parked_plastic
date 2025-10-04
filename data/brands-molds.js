// data/brands-molds.js

// How many from the top are “featured”
export const FEATURED_COUNT = 30;

// Ordered entries: brand -> popular molds
export const BRAND_ENTRIES = [
  ["Axiom", [
    "Envy", "Proxy", "Hex", "Crave", "Insanity", "Fireball", "Defy", "Tempo", "Mayhem",
    "Paradox", "Virus", "Delirium", "Excite", "Pyro", "Inspire", "Tantrum", "Panic",
    "Thrill", "Insanity"
  ]],
  ["Discmania", [
    "P1", "P2", "P3x", "MD1", "MD2", "MD3", "MD4", "FD", "FD2", "FD3",
    "CD2", "CD3", "PD", "PD2", "PD3", "DD", "DD2", "DD3", "TD", "TD2",
    "Essence", "Instinct", "Origin", "Method", "Mutant", "Tilt"
  ]],
  ["Discraft", [
    "Buzzz", "Buzzz OS", "Buzzz SS", "Zone", "Zone OS", "Zone SS", "Force", "Undertaker", "Nuke", "Nuke OS",
    "Nuke SS", "Luna", "Challenger", "Challenger SS", "Crank", "Comet", "Heat", "Vulture",
    "Scorch", "Thrasher", "Avenger SS", "Roach", "Meteor", "Raptor"
  ]],
  ["Dynamic Discs", [
    "Judge", "Classic Judge", "Prime Judge", "Truth", "Verdict", "Emac Judge",
    "Trespass", "Felon", "Escape", "Warden", "Raider", "Maverick", "Vandal",
    "Sheriff", "Getaway", "Convict", "Defender", "Freedom", "Slammer", "Deputy",
    "Suspect"
  ]],
  ["Gateway", [
    "Wizard", "Warlock", "Magic", "Chief", "Voodoo",
    "Shaman", "Mystic", "Apache", "Element", "Diablo"
  ]],
  ["Infinite Discs", [
    "Emperor", "Pharaoh", "Sphinx", "Tomb", "Aztec",
    "Centurion", "Dynasty", "Exodus", "Rift", "Slab",
    "Anubis", "Chariot", "Ruins", "Roman", "Scepter"
  ]],
  ["Innova", [
    "Destroyer", "Wraith", "Teebird", "Teebird3", "Firebird", "Aviar", "Aviar3",
    "Mako3", "Roc", "Roc3", "RocX3", "Leopard", "Leopard3", "Tern",
    "Thunderbird", "Shryke", "Boss", "Katana", "Colossus", "Valkyrie",
    "Eagle", "Orc", "Sidewinder", "Cheetah", "Panther", "Rhyno", "Pig", "Gator3"
  ]],
  ["Kastaplast", [
    "Berg", "Reko", "Reko X", "Lots", "Stal", "Grym", "Grym X",
    "Gote", "Kaxe", "Kaxe Z", "Krut", "Falk", "Jarn", "Svea",
    "Sarek", "Rask", "Stig", "Vass"
  ]],
  ["Latitude 64", [
    "Pure", "Diamond", "River", "River Pro", "Saint", "Saint Pro",
    "Grace", "Ballista", "Ballista Pro", "Fuse", "Pioneer", "Explorer",
    "Bolt", "Flow", "Striker", "Trident", "Culverin", "XXX", "Havoc", "Vision"
  ]],
  ["MVP", [
    "Wave", "Volt", "Tesla", "Reactor", "Nomad", "Catalyst", "Photon",
    "Relay", "Inertia", "Amp", "Signal", "Impulse", "Octane", "Energy",
    "Motion", "Terra", "Resistor", "Axis", "Vector", "Matrix"
  ]],
  ["Prodigy", [
    "PA-1", "PA-2", "PA-3", "PA-4", "M1", "M2", "M3", "M4",
    "F1", "F2", "F3", "F5", "D1", "D2", "D3", "D4",
    "H1", "H2", "H3", "H4", "A1", "A2", "A3", "A4",
    "FX-2", "X3"
  ]],
  ["Streamline", [
    "Pilot", "Drift", "Trace", "Lift", "Runway"
  ]],
  ["Westside Discs", [
    "Harp", "Warship", "Sword", "Queen", "King", "Stag",
    "Hatchet", "Pine", "Anvil", "Swan", "Swan 2", "Maiden"
  ]],
  ["DGA", ["Breakout", "Pipeline", "Sail", "Hurricane", "Squall"]],
  ["Clash Discs", ["Mint", "Peppermint", "Berry", "Popcorn", "Mango"]],
  ["Thought Space Athletics", ["Mantra", "Synapse", "Coalesce", "Construct", "Pathfinder"]],
  ["Lone Star Discs", ["Penny Putter", "Armadillo", "Mockingbird", "Tombstone", "Harpoon"]],
  ["Mint Discs", ["Alpha", "Freetail", "Bullet", "Jackalope", "Mustang"]],
  ["RPM Discs", ["Piwakawaka", "Kea", "Ruru", "Taniwha", "Kotare"]],
  ["Prodiscus", ["Titan", "Midari", "Respecti", "Legenda", "Jokeri"]],
  ["Divergent Discs", ["Nuno", "Kraken", "Leviathan", "Lawin", "Kapre"]],
  ["Disc Golf UK", ["Barbarian", "Merlin", "Leprechaun", "Grizzly", "Bulldog"]],
  ["Loft Discs", ["Bohrium", "Silicon", "Hydrogen", "Xenon", "Helium"]],
  ["Viking Discs", ["Fenrir", "Rune", "Axe", "Berserker", "Nordic Warrior"]],
  ["Birdie", ["Marvel", "Raven", "Strike", "Reach", "Falcon"]],
  ["Doomsday Discs", ["Plague", "Cataclysm", "Despair", "Bleak", "Wrath"]],
  ["Millennium", ["JLS", "OLS", "Sirius", "Astra", "Polaris LS"]],
  ["Alpha Discs", ["Spoiler", "Blackout", "Vanish", "Flux", "Twilight"]],
  ["EV-7", ["Penrose", "Phi", "Telos", "iON", "OG Base"]],
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

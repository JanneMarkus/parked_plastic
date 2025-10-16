// pages/about.js
import Head from "next/head";
import Link from "next/link";

export default function About() {
  return (
    <div className="pp-wrap">
      <Head>
        <title>About Parked Plastic</title>
        <meta
          name="description"
          content="Parked Plastic is a 24/7 local swap’n’sell for disc golfers — post extra plastic, browse listings, and give discs a second life."
        />
      </Head>

      <h1>Parked Plastic: A Local Swap’n’Sell for Discs</h1>
      <p>
        If you’ve played disc golf for a while, you probably have a few stacks of
        extra plastic sitting in a closet, the garage, or the trunk. Some never
        quite clicked. Others were replaced by newer favorites. Meanwhile,
        someone nearby is searching for exactly what you’ve got parked away.
      </p>
      <p>
        That’s where <strong>Parked Plastic</strong> comes in — a simple, local
        website built for our disc golf community. Think of it as a
        <strong> 24/7 Swap’n’Sell</strong>: connect with nearby buyers and
        sellers all year long, instead of waiting for the annual swap meet.
      </p>

      <div className="pp-card pp-card--pad" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>What You Can Do</h2>
        <ul>
          <li>
            <strong>Post extra plastic</strong> you’re not throwing — give your
            discs a second life in someone else’s bag.
          </li>
          <li>
            <strong>Browse listings</strong> with useful filters like brand,
            mold, plastic, condition, weight, and flight numbers.
          </li>
          <li>
            <strong>Trade or sell locally</strong> — connect with nearby
            players, avoid shipping, and meet up at your home course.
          </li>
        </ul>
      </div>

      <div className="pp-grid2" style={{ marginTop: 16 }}>
        <div className="pp-card pp-card--pad">
          <h3 style={{ marginTop: 0 }}>How It Works</h3>
          <ol>
            <li>
              <strong>Create an account</strong> to manage your listings and
              messaging preferences.
            </li>
            <li>
              <strong>Post a disc</strong> with photos, price, and details
              (brand, mold, plastic, condition, weight).
            </li>
            <li>
              <strong>Share and respond</strong> — buyers can find your listing
              and reach out. Mark items as <em>pending</em> or <em>sold </em>
              when they’re off the market.
            </li>
          </ol>
        </div>
        <div className="pp-card pp-card--pad">
          <h3 style={{ marginTop: 0 }}>Why Local?</h3>
          <ul>
            <li>Meet at familiar courses or league nights.</li>
            <li>No shipping surprises; see the disc in person.</li>
            <li>Keep good plastic in play — support the local scene.</li>
          </ul>
        </div>
      </div>

      {/* Meet-up safety guidance */}
      <div className="pp-card pp-card--pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Meet-Up Safety Tips</h3>
        <ul>
          <li>Meet in a public, well-lit place (course parking lot works great).</li>
          <li>Aim for daytime meetups; bring a friend if it’s late.</li>
          <li>Agree on price and condition ahead of time in messages.</li>
          <li>Inspect the disc in person before paying.</li>
          <li>Use simple, instant payments (cash or e‑transfer) and avoid shipping when possible.</li>
          <li>Trust your gut — if something feels off, walk away.</li>
        </ul>
      </div>

      {/* Quick FAQ */}
      <div className="pp-card pp-card--pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>FAQ</h3>
        <p><strong>Is Parked Plastic free?</strong><br />Yes — browsing and posting are free.</p>
        <p><strong>Can I mark a disc as pending or sold?</strong><br />Yes — go to <Link href="/account">My Account</Link> to manage your listings and set status.</p>
        <p><strong>Can I trade instead of sell?</strong><br />Absolutely. Mention trade interests in your description and coordinate with local players.</p>
        <p><strong>How do I report an issue?</strong><br />Use <Link href="/report-bug">Report a bug</Link> with details, or flag a specific listing using the report option.</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <Link href="/create-listing" className="pp-btn pp-btn--primary">
          Post a Disc
        </Link>
        <Link href="/" className="pp-btn pp-btn--secondary">
          Browse Listings
        </Link>
        <a
          className="pp-btn"
          href="https://www.parkedplastic.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          parkedplastic.com ↗
        </a>
      </div>

      <div style={{ marginTop: 24 }}>
        <p>
          Found a bug or have an idea to make it better?{' '}
          <Link href="/report-bug">Report a bug</Link> or manage your settings on{' '}
          <Link href="/account">My Account</Link>.
        </p>
      </div>
    </div>
  );
}

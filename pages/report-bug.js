// pages/report-bug.js
import Head from "next/head";

export default function ReportBug() {
  return (
    <div className="pp-wrap">
      <Head>
        <title>Report a Bug - Parked Plastic</title>
        <meta name="description" content="Report an issue with Parked Plastic." />
      </Head>
      <h1>Report a Bug</h1>
      <p>
        Found something off? Tell us what happened, what you expected, and any steps to reproduce.
      </p>
      <p>
        You can email us at
        {" "}
        <a href="mailto:janneo011@gmail.com">janneo011@gmail.com</a>
        {" "}
        or include details below.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const f = e.currentTarget;
            const subject = encodeURIComponent("Bug report: Parked Plastic");
            const body = encodeURIComponent(
              `Page: ${f.page?.value}\n\nWhat happened:\n${f.what?.value}\n\nSteps to reproduce:\n${f.steps?.value}`
            );
            window.location.href = `mailto:janneo011@gmail.com?subject=${subject}&body=${body}`;
          } catch {}
        }}
        className="pp-card pp-card--pad"
      >
        <div className="pp-grid2">
          <div className="pp-field">
            <label htmlFor="page">Page/URL</label>
            <input id="page" name="page" className="pp-input" placeholder="e.g. /listings/abc123" />
          </div>
          <div className="pp-field">
            <label htmlFor="what">What happened</label>
            <textarea id="what" name="what" className="pp-textarea" placeholder="Describe the issue" />
          </div>
          <div className="pp-field">
            <label htmlFor="steps">Steps to reproduce</label>
            <textarea id="steps" name="steps" className="pp-textarea" placeholder="Step-by-step" />
          </div>
        </div>
        <div className="pp-actions" style={{ marginTop: 12 }}>
          <button type="submit" className="pp-btn pp-btn--primary">Compose Email</button>
        </div>
      </form>
    </div>
  );
}

# Grand Prix Archive

A public dashboard for every Formula 1 championship race since 1950, with a written
analysis of each one.

Live data comes from [jolpica-f1](https://github.com/jolpica/jolpica-f1), the
community-run successor to Ergast — free, no key, updated within hours of a race.

---

## How it is built

The whole thing is a **static site**. There is no server and no API key in production.

- **Race data** is fetched in the visitor's own browser, straight from jolpica-f1.
  Every visitor uses their own rate-limit allowance, so traffic costs you nothing.
- **Write-ups** are plain JSON files in `public/briefs/`, generated ahead of time
  by you and committed to the repo. Visitors read them; they never trigger a model call.

That second point is the important one. If visitors could generate analysis on demand,
every person who opened the site would be spending your API credit, and a single
script could drain the account overnight. Pre-generating removes the problem entirely.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Deploy it (Firebase Hosting)

```bash
npm i -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting
```

Put your project ID in `.firebaserc` first. Free on the Spark plan: 10 GB of transfer
a month, no credit card, custom domain and SSL included.

Note: `firebase.json` deliberately has no catch-all rewrite. The app checks for a
missing write-up by looking for a 404, and a rewrite would return `index.html` with a
200 instead, so every race would appear to have a brief.

## Write the analyses

The scripts use Gemini when `GEMINI_API_KEY` is set, and fall back to Claude when
only `ANTHROPIC_API_KEY` is present. Gemini's AI Studio free tier covers this workload
with room to spare. Either key lives only on your machine or in GitHub Actions
secrets — never in the deployed site.

**New races, automatically.** `.github/workflows/race-brief.yml` runs hourly, checks
whether a new result has appeared, and writes the brief if so. Because it polls rather
than following a race calendar, the write-up lands within an hour of results being
published without you maintaining a schedule.

Switch it on: push to GitHub → Settings → Secrets and variables → Actions → add
`ANTHROPIC_API_KEY`. Redeploys happen on push if your host is connected to the repo.

**Past races, in batches.** Fill the archive at your own pace:

```bash
export GEMINI_API_KEY=...
npm run backfill 2026              # the current season
npm run backfill 1976 1982         # a range
npm run backfill 1950 2026 -- --max 50   # 50 at a time
```

Finished races are skipped, so you can stop and resume whenever. Roughly 1,150 races
have been run since 1950; expect a few cents each, so the full archive is a modest
one-off cost rather than an ongoing one.

## Before you make it public

- **Don't use Formula 1 trademarks.** No "F1" or "Formula 1" in the name, logo, or
  domain, and no official imagery. Formula One Management enforces its marks. Descriptive
  wording like "Grand Prix results and analysis" is fine.
- **Credit the data source.** jolpica-f1 is volunteers running on donations. Link it in
  the footer, and read their terms of use.
- **Say what the analysis is.** A short line noting the write-ups are AI-generated from
  race data is honest and takes one sentence.

## Notes

- Historic gaps are real, not bugs: fastest laps from 2004, qualifying times from 2003,
  the constructors' championship from 1958.
- The season points curve sums points as awarded. Before 1991 only a driver's best few
  results counted toward the title, so the curve can run ahead of the table of the day.

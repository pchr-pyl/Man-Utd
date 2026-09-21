# Man Utd data workspace

## Files
- `man-utd-seasons.csv` / `man-utd-seasons.json` — top-level copies of the dataset
- `man-utd-dashboard/` — Next.js dashboard + data pipeline (real source of truth)
  - `scripts/build_data.py` — merges raw scrapes into `data/man-utd-seasons.{csv,json}`
  - `data/raw/history.json` — firecrawl markdown of fbref Stats & History page (all seasons)
  - `data/raw/matchlog-YYYY-YYYY.json` — per-season Scores & Fixtures tables, 1992-93..2025-26
  - `data/raw/understat-YYYY.json` — EPL xG per match, 2014-15+ only
  - `data/raw/capology-YYYY-YYYY.json` — Capology salary scrapes, 2013-14..2026-27
  - `data/man-utd-salaries.json` — parsed salary data keyed by season
  - `data/man-utd-squad.json` — SquadData for the /squad page (multi-season, built by `scripts/parse_capology.py`; salaries are Capology estimates, not official figures)

## Refresh command
User says "อัพเดต man utd csv" or "refresh fbref" → re-scrape changed raw files,
re-run `python -X utf8 scripts/build_data.py` in `man-utd-dashboard/`, then copy
`data/man-utd-seasons.{csv,json}` to this folder.

IMPORTANT: when `DATABASE_URL` is set (.env.local / Vercel), pages read from the
Neon DB, NOT the JSON files — after rebuild also run `npm run db:seed` in
`man-utd-dashboard/man-utd-dashboard/` or the site keeps showing stale data.

## Re-scraping matchlogs (fbref blocks bots — Cloudflare 403)
- Raw HTTP/XHR fetch fails even inside an fbref page context. Must use Playwright
  `browser_navigate` per URL, wait ~8s if "Just a moment..." challenge, then
  `browser_evaluate` to serialize the Scores & Fixtures table to markdown:
  header row `| Date | Time | Comp | ... |`, separator, one `| ... |` line per match.
  Save as `{markdown, metadata:{sourceURL}}` JSON — same shape as existing raw files.
- Playwright `filename` results land in its own workspace root — check
  `man-utd-dashboard/` subdirs if a file seems missing from cwd.
- URL pattern: `https://fbref.com/en/squads/19538871/{SEASON}/matchlogs/all_comps/schedule/Manchester-United-Scores-and-Fixtures-All-Competitions`
- BULK ALTERNATIVE (used for stat logs): after navigating to ANY fbref page once,
  `fetch(url, {credentials:'include'})` inside `browser_evaluate` works same-origin
  and returns full HTML (Cloudflare cookie already set). Loop seasons × types in a
  single evaluate with ~700ms delay; parse with `DOMParser`, select
  `table#matchlogs_for` + `table#matchlogs_against`. Much faster than navigating.

## Stat matchlogs (shooting / keeper / misc)
- Raw files: `data/raw/matchlog-YYYY-YYYY-{shooting,keeper,misc}.json` —
  `{tables: [{label, columns, rows}], metadata:{sourceURL}}` (structured JSON,
  NOT markdown like schedule files). `label` = "For Manchester United" or
  "Against Manchester United".
- URL pattern: same as schedule but `/all_comps/{shooting|keeper|misc}/` and
  page slug `Manchester-United-Match-Logs-All-Competitions`.
- `scripts/build_matchlogs.py` → merged `data/man-utd-matchlogs.json` +
  per-season `public/data/matchlogs-YYYY-YYYY.json` (lazy-fetched by MatchLog UI).
- `build_matches.py` glob intentionally matches only `matchlog-\d{4}-\d{4}.json`
  so stat files are not parsed as schedules.
- Old seasons have empty cells for many stat columns (fbref coverage) — rows are
  kept verbatim; UI renders blanks as "—".

## New datasets (2026-09)
- `data/raw/keeper-YYYY.json` — team keeper matchlog all comps (SoTA/saves/CS/PK), 2014-15+
- `data/raw/keeper-squad-YYYY.json` — stats_keeper_combined per-GK season totals, all comps
- `data/raw/keeperadv-YYYY.json` — PL league keepersadv; PSxG columns EMPTY (see below)
- `data/man-utd-keepers.json` — built: matchLog + perGkSeason + psxg + psxgPerGk
- `data/man-utd-squad.json` — HAND-MAINTAINED wages/contracts (from user's sheet). Edit JSON, don't regenerate.
- `data/man-utd-psxg-legacy.json` — PSxG seed from old Google Sheet. goalsPrevented = psxg - (ga - pka), verified 9/9 vs their chart.
- `data/raw/players-YYYY.json` — squad page player stats (standard+shooting+playingTime+misc tables);
  NO xG columns — fbref removed them along with PSxG. Counting stats only.
- `data/man-utd-players.json` — built: {seasons:{season:{players,sourceURL}},latest}
- New pages: /keepers /squad /compare (+ /managers from parallel session)

## fbref removed PSxG site-wide
keeper_adv tables exist but PSxG/PSxG+/- sweeper/passing cells are blank in DOM — Opta
feed pulled ~2025. Season PSxG comes from legacy JSON only (2017-18+, PL only).
Per-match PSxG not available anywhere post-removal — don't promise it.

## Coverage limits (fbref's, not bugs)
- Domestic cups (FA Cup, League/EFL Cup) + Charity/Community Shield only exist on
  fbref from ~2014-15 (partially) / 2016-17 (full). Older seasons = league + Europe only.
- xG only from Understat, 2014-15 onward, Premier League only. Null elsewhere.
- fbref history table vs matchlog occasionally disagree (e.g. shootout legs counted
  as W vs D). Pipeline prefers matchlog and prints mismatches.

## Gotchas
- Console is cp1252 — use `python -X utf8` when printing scraped text.
- History markdown bolds title-winning ranks (`**1st**`) — strip_md removes `*`.
- UEFA Cup is canonicalized to "Europa League" (same competition, renamed).

## Display rules
- **ทศนิยม 2 ตำแหน่งเท่านั้น** — all displayed decimals (per-match stats, xG, %, deltas) use exactly 2 decimal places; rounding is fine. Default `dec = 2` in `src/lib/format.ts`. Integers stay integers.

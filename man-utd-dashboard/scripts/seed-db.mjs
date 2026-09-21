import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const readJson = async (name) => JSON.parse(await readFile(join(dataDir, name), 'utf8'));
const sql = neon(databaseUrl);
const seasonRows = (await readJson('man-utd-seasons.json')).map((row, position) => ({ ...row, position }));
const matches = (await readJson('man-utd-matches.json')).map((row, position) => ({
  ...row,
  position,
  matchKey: [row.season, row.date, row.competition, row.opponent ?? '', row.round ?? ''].join('|'),
}));

await sql.query(`
  INSERT INTO season_stats (
    season, competition, position, rank, mp, w, d, l, gf, ga, gd, pts, pts_per_mp,
    xg, xga, xgd, sota, cs, attendance, top_scorer, goalkeeper, notes, updated_at
  )
  SELECT season, competition, position, rank, mp, w, d, l, gf, ga, gd, pts, pts_per_mp,
    xg, xga, xgd, sota, cs, attendance, top_scorer, goalkeeper, notes, now()
  FROM jsonb_to_recordset($1::jsonb) AS row(
    season text, competition text, position integer, rank text, mp integer, w integer,
    d integer, l integer, gf integer, ga integer, gd integer, pts integer,
    pts_per_mp double precision, xg double precision, xga double precision,
    xgd double precision, sota double precision, cs double precision,
    attendance double precision, top_scorer text, goalkeeper text, notes text
  )
  ON CONFLICT (season, competition) DO UPDATE SET
    position = EXCLUDED.position, rank = EXCLUDED.rank, mp = EXCLUDED.mp, w = EXCLUDED.w,
    d = EXCLUDED.d, l = EXCLUDED.l, gf = EXCLUDED.gf, ga = EXCLUDED.ga, gd = EXCLUDED.gd,
    pts = EXCLUDED.pts, pts_per_mp = EXCLUDED.pts_per_mp, xg = EXCLUDED.xg,
    xga = EXCLUDED.xga, xgd = EXCLUDED.xgd, sota = EXCLUDED.sota, cs = EXCLUDED.cs,
    attendance = EXCLUDED.attendance, top_scorer = EXCLUDED.top_scorer,
    goalkeeper = EXCLUDED.goalkeeper, notes = EXCLUDED.notes, updated_at = now()
`, [JSON.stringify(seasonRows.map((row) => ({
  season: row.season,
  competition: row.competition,
  position: row.position,
  rank: row.rank,
  mp: row.mp,
  w: row.w,
  d: row.d,
  l: row.l,
  gf: row.gf,
  ga: row.ga,
  gd: row.gd,
  pts: row.pts,
  pts_per_mp: row.ptsPerMp,
  xg: row.xg,
  xga: row.xga,
  xgd: row.xgd,
  sota: row.sota,
  cs: row.cs,
  attendance: row.attendance,
  top_scorer: row.topScorer,
  goalkeeper: row.goalkeeper,
  notes: row.notes,
})))])

await sql.query(`
  INSERT INTO matches (
    match_key, position, season, match_date, match_time, competition, round, venue,
    result, gf, ga, gf_pens, ga_pens, opponent, possession, attendance, captain,
    formation, opponent_formation, referee, notes, xg, xga, updated_at
  )
  SELECT match_key, position, season, match_date, match_time, competition, round, venue,
    result, gf, ga, gf_pens, ga_pens, opponent, possession, attendance, captain,
    formation, opponent_formation, referee, notes, xg, xga, now()
  FROM jsonb_to_recordset($1::jsonb) AS row(
    match_key text, position integer, season text, match_date date, match_time text,
    competition text, round text, venue text, result text, gf integer, ga integer,
    gf_pens integer, ga_pens integer, opponent text, possession double precision,
    attendance double precision, captain text, formation text, opponent_formation text,
    referee text, notes text, xg double precision, xga double precision
  )
  ON CONFLICT (match_key) DO UPDATE SET
    position = EXCLUDED.position, result = EXCLUDED.result, gf = EXCLUDED.gf, ga = EXCLUDED.ga,
    gf_pens = EXCLUDED.gf_pens, ga_pens = EXCLUDED.ga_pens, possession = EXCLUDED.possession,
    attendance = EXCLUDED.attendance, captain = EXCLUDED.captain, formation = EXCLUDED.formation,
    opponent_formation = EXCLUDED.opponent_formation, referee = EXCLUDED.referee,
    notes = EXCLUDED.notes, xg = EXCLUDED.xg, xga = EXCLUDED.xga, updated_at = now()
`, [JSON.stringify(matches.map((row) => ({
  match_key: row.matchKey,
  position: row.position,
  season: row.season,
  match_date: row.date,
  match_time: row.time,
  competition: row.competition,
  round: row.round,
  venue: row.venue,
  result: row.result,
  gf: row.gf,
  ga: row.ga,
  gf_pens: row.gfPens,
  ga_pens: row.gaPens,
  opponent: row.opponent,
  possession: row.possession,
  attendance: row.attendance,
  captain: row.captain,
  formation: row.formation,
  opponent_formation: row.oppFormation,
  referee: row.referee,
  notes: row.notes,
  xg: row.xg,
  xga: row.xga,
})))])

const datasetFiles = (await readdir(dataDir))
  .filter((name) => /^man-utd-.*\.json$/.test(name))
  .filter((name) => !['man-utd-seasons.json', 'man-utd-matches.json'].includes(name));

for (const name of datasetFiles) {
  const key = name.replace(/^man-utd-/, '').replace(/\.json$/, '');
  const payload = await readJson(name);
  await sql`
    INSERT INTO datasets (key, payload, updated_at)
    VALUES (${key}, ${JSON.stringify(payload)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
  `;
}

console.log(`seeded ${seasonRows.length} season rows, ${matches.length} matches, and ${datasetFiles.length} datasets`);

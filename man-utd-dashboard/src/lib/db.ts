import 'server-only';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { MatchRow, SeasonRow } from './types';

let client: NeonQueryFunction<false, false> | undefined;

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  client ??= neon(databaseUrl);
  return client;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function querySeasonRows(): Promise<SeasonRow[]> {
  const rows = await getClient().query(`
    SELECT season, competition, rank, mp, w, d, l, gf, ga, gd, pts,
      pts_per_mp AS "ptsPerMp", xg, xga, xgd, sota, cs, attendance,
      top_scorer AS "topScorer", goalkeeper, notes
    FROM season_stats
    ORDER BY position
  `);
  return rows as unknown as SeasonRow[];
}

export async function queryMatches(): Promise<MatchRow[]> {
  const rows = await getClient().query(`
    SELECT season, match_date::text AS date, match_time AS time, competition, round,
      venue, result, gf, ga, gf_pens AS "gfPens", ga_pens AS "gaPens", opponent,
      possession, attendance, captain, formation, opponent_formation AS "oppFormation",
      referee, notes, xg, xga
    FROM matches
    ORDER BY position
  `);
  return rows as unknown as MatchRow[];
}

export async function queryDataset<T>(key: string): Promise<T | null> {
  const rows = await getClient().query('SELECT payload FROM datasets WHERE key = $1', [key]);
  return rows.length === 0 ? null : rows[0].payload as T;
}

export async function saveDataset(key: string, payload: unknown): Promise<void> {
  await getClient().query(
    `INSERT INTO datasets (key, payload, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
    [key, JSON.stringify(payload)],
  );
}

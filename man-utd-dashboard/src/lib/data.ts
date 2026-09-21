import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cache } from 'react';
import { hasDatabase, queryDataset, queryMatches, querySeasonRows, saveDataset } from './db';
import { fetchMatchDetail, type MatchDetail } from './understat';
import type { SeasonRow, MatchRow, KeepersData, SquadData, PlayersData, AttackBySeason, SeasonMatchlogs } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const JSON_PATH = join(DATA_DIR, 'man-utd-seasons.json');
const CSV_PATH = join(DATA_DIR, 'man-utd-seasons.csv');
const MATCHES_PATH = join(DATA_DIR, 'man-utd-matches.json');
const ATTACK_PATH = join(DATA_DIR, 'man-utd-attack.json');
const KEEPERS_PATH = join(DATA_DIR, 'man-utd-keepers.json');
const SQUAD_PATH = join(DATA_DIR, 'man-utd-squad.json');
const PLAYERS_PATH = join(DATA_DIR, 'man-utd-players.json');

const NUMERIC_FIELDS: ReadonlyArray<keyof SeasonRow> = [
  'mp',
  'w',
  'd',
  'l',
  'gf',
  'ga',
  'gd',
  'pts',
  'ptsPerMp',
  'xg',
  'xga',
  'xgd',
  'sota',
  'cs',
  'attendance',
];

function normalizeHeader(raw: string): keyof SeasonRow | 'ignore' {
  const h = raw.trim();
  const map: Record<string, keyof SeasonRow> = {
    season: 'season',
    seasonstart: 'season',
    competition: 'competition',
    comp: 'competition',
    rank: 'rank',
    lgrank: 'rank',
    mp: 'mp',
    w: 'w',
    d: 'd',
    l: 'l',
    gf: 'gf',
    ga: 'ga',
    gd: 'gd',
    pts: 'pts',
    ptsmp: 'ptsPerMp',
    ptsg: 'ptsPerMp',
    ptspermp: 'ptsPerMp',
    ptspergame: 'ptsPerMp',
    xg: 'xg',
    xga: 'xga',
    xgd: 'xgd',
    sota: 'sota',
    cs: 'cs',
    attendance: 'attendance',
    topteamscorer: 'topScorer',
    topgoals: 'topScorer',
    topscorer: 'topScorer',
    goalkeeper: 'goalkeeper',
    gk: 'goalkeeper',
    notes: 'notes',
  };
  const key = h.toLowerCase().replace(/[^a-z]/g, '');
  return map[key] ?? 'ignore';
}

function parseNumberCell(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'nan') return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i += 1;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      i += 1;
    } else {
      current += char;
      i += 1;
    }
  }
  fields.push(current);
  return fields;
}

function parseSeasonsFromCsv(text: string): SeasonRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: SeasonRow[] = [];

  for (let idx = 1; idx < lines.length; idx += 1) {
    const cells = parseCsvLine(lines[idx]);
    const parsed: Record<keyof SeasonRow, unknown> = {
      season: '',
      competition: '',
      rank: null,
      mp: null,
      w: null,
      d: null,
      l: null,
      gf: null,
      ga: null,
      gd: null,
      pts: null,
      ptsPerMp: null,
      xg: null,
      xga: null,
      xgd: null,
      sota: null,
      cs: null,
      attendance: null,
      topScorer: null,
      goalkeeper: null,
      notes: null,
    };

    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      if (key === 'ignore') continue;
      const value = cells[c] ?? '';
      if (NUMERIC_FIELDS.includes(key)) {
        parsed[key] = parseNumberCell(value);
      } else {
        const trimmed = value.trim();
        parsed[key] = trimmed === '' ? null : trimmed;
      }
    }

    if (!parsed.competition) parsed.competition = '';

    rows.push(parsed as SeasonRow);
  }

  return rows;
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export const getSeasonRows = cache(async (): Promise<SeasonRow[]> => {
  if (hasDatabase()) return querySeasonRows();
  if (existsSync(JSON_PATH)) return readJson<SeasonRow[]>(JSON_PATH, []);
  if (existsSync(CSV_PATH)) return parseSeasonsFromCsv(readFileSync(CSV_PATH, 'utf-8'));
  throw new Error('Data file not found: expected data/man-utd-seasons.json or .csv');
});

export const getMatches = cache(async (): Promise<MatchRow[]> => {
  if (hasDatabase()) return queryMatches();
  return readJson<MatchRow[]>(MATCHES_PATH, []);
});

export const getKeepers = cache(async (): Promise<KeepersData> => {
  const fallback = { matchLog: [], perGkSeason: [], psxg: [], psxgPerGk: [] };
  if (hasDatabase()) return await queryDataset<KeepersData>('keepers') ?? fallback;
  return readJson<KeepersData>(KEEPERS_PATH, fallback);
});

export const getSquad = cache(async (): Promise<SquadData> => {
  const fallback = { updated: null, players: [] };
  if (hasDatabase()) return await queryDataset<SquadData>('squad') ?? fallback;
  return readJson<SquadData>(SQUAD_PATH, fallback);
});

export const getPlayers = cache(async (): Promise<PlayersData> => {
  const fallback = { seasons: {}, latest: '' };
  if (hasDatabase()) return await queryDataset<PlayersData>('players') ?? fallback;
  return readJson<PlayersData>(PLAYERS_PATH, fallback);
});

export const getAttack = cache(async (): Promise<AttackBySeason> => {
  if (hasDatabase()) return await queryDataset<AttackBySeason>('attack') ?? {};
  return readJson<AttackBySeason>(ATTACK_PATH, {});
});

export const getAttackLeague = cache(async (): Promise<AttackBySeason> => {
  if (hasDatabase()) return await queryDataset<AttackBySeason>('attack-league') ?? {};
  return readJson<AttackBySeason>(join(DATA_DIR, 'man-utd-attack-league.json'), {});
});

export const getMatchlogs = cache(async (season: string): Promise<SeasonMatchlogs> => {
  const key = `matchlogs-${season}`;
  if (hasDatabase()) return await queryDataset<SeasonMatchlogs>(key) ?? {};
  return readJson<SeasonMatchlogs>(join(process.cwd(), 'public', 'data', `${key}.json`), {});
});

function understatIndexFromFiles(): Record<string, string> {
  const dir = join(DATA_DIR, 'raw');
  if (!existsSync(dir)) return {};
  const index: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (!/^understat-\d+\.json$/.test(name)) continue;
    try {
      const data = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
        dates?: Array<{ id?: string; datetime?: string; isResult?: boolean }>;
      };
      for (const entry of data.dates ?? []) {
        if (entry.id && entry.datetime && entry.isResult) {
          index[entry.datetime.slice(0, 10)] = entry.id;
        }
      }
    } catch {
      continue;
    }
  }
  return index;
}

export const getUnderstatIndex = cache(async (): Promise<Record<string, string>> => {
  if (hasDatabase()) {
    return (await queryDataset<Record<string, string>>('understat-index')) ?? {};
  }
  return understatIndexFromFiles();
});

export const getMatchDetail = cache(async (date: string): Promise<MatchDetail | null> => {
  const key = `matchdetail-${date}`;
  if (hasDatabase()) {
    const cached = await queryDataset<MatchDetail>(key);
    if (cached) return cached;
  }
  const index = await getUnderstatIndex();
  const id = index[date];
  if (!id) return null;
  const detail = await fetchMatchDetail(id);
  if (detail && hasDatabase()) {
    await saveDataset(key, detail).catch(() => {});
  }
  return detail;
});

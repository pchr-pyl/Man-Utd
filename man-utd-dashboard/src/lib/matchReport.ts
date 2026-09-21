import type { MatchRow, MatchlogTable, SeasonMatchlogs } from './types';

export interface StatComparison {
  key: string;
  home: number | null;
  away: number | null;
  decimals: number;
  suffix?: string;
}

function num(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function rowForDate(
  table: MatchlogTable | undefined,
  date: string,
): Record<string, string> | null {
  if (!table) return null;
  const dateIdx = table.columns.indexOf('Date');
  const row = table.rows.find((r) => r[dateIdx] === date);
  if (!row) return null;
  const out: Record<string, string> = {};
  table.columns.forEach((col, i) => {
    if (!(col in out)) out[col] = row[i] ?? '';
  });
  return out;
}

export function isCompleted(match: MatchRow): boolean {
  return match.result != null && match.gf != null && match.ga != null;
}

export function isUnitedHome(match: MatchRow): boolean {
  return match.venue !== 'Away';
}

export function homeScore(match: MatchRow): number | null {
  return isUnitedHome(match) ? match.gf : match.ga;
}

export function awayScore(match: MatchRow): number | null {
  return isUnitedHome(match) ? match.ga : match.gf;
}

export function homeTeamName(match: MatchRow): string {
  return isUnitedHome(match) ? 'Manchester United' : (match.opponent ?? '');
}

export function awayTeamName(match: MatchRow): string {
  return isUnitedHome(match) ? (match.opponent ?? '') : 'Manchester United';
}

export function buildComparisons(
  match: MatchRow,
  matchlogs: SeasonMatchlogs | null,
): StatComparison[] {
  const shotsFor = rowForDate(matchlogs?.shooting?.for, match.date);
  const shotsAgainst = rowForDate(matchlogs?.shooting?.against, match.date);
  const keeperFor = rowForDate(matchlogs?.keeper?.for, match.date);
  const keeperAgainst = rowForDate(matchlogs?.keeper?.against, match.date);
  const miscFor = rowForDate(matchlogs?.misc?.for, match.date);
  const miscAgainst = rowForDate(matchlogs?.misc?.against, match.date);

  const utd: Array<number | null> = [
    match.xg,
    match.possession,
    num(shotsFor?.Sh),
    num(shotsFor?.SoT),
    num(shotsFor?.['SoT%']),
    num(keeperFor?.Saves),
    num(miscFor?.Fls),
    num(miscFor?.CrdY),
    num(miscFor?.CrdR),
    num(miscFor?.Off),
    num(miscFor?.Crs),
    num(miscFor?.Int),
    num(miscFor?.TklW),
    num(miscFor?.PKwon),
  ];
  const opp: Array<number | null> = [
    match.xga,
    match.possession != null ? 100 - match.possession : null,
    num(shotsAgainst?.Sh),
    num(shotsAgainst?.SoT),
    num(shotsAgainst?.['SoT%']),
    num(keeperAgainst?.Saves),
    num(miscAgainst?.Fls),
    num(miscAgainst?.CrdY),
    num(miscAgainst?.CrdR),
    num(miscAgainst?.Off),
    num(miscAgainst?.Crs),
    num(miscAgainst?.Int),
    num(miscAgainst?.TklW),
    num(miscAgainst?.PKwon),
  ];
  const keys = [
    'xg',
    'poss',
    'sh',
    'sot',
    'sotPct',
    'saves',
    'fls',
    'crdY',
    'crdR',
    'off',
    'crs',
    'int',
    'tklW',
    'pkWon',
  ];
  const decimals = [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const suffixes = ['', '%', '', '', '%', '', '', '', '', '', '', '', '', ''];

  const home = isUnitedHome(match);
  return keys
    .map((key, i) => ({
      key,
      home: home ? utd[i] : opp[i],
      away: home ? opp[i] : utd[i],
      decimals: decimals[i],
      suffix: suffixes[i] || undefined,
    }))
    .filter((c) => c.home != null || c.away != null);
}

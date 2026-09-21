'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipContentProps,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow } from '@/lib/types';
import { fmt, pct, signed } from '@/lib/format';
import { seasonShort } from '@/lib/stats';
import { ColTip } from './ColTip';

function pts(result: string | null): number {
  if (result === 'W') return 3;
  if (result === 'D') return 1;
  return 0;
}

function cumPoints(rows: MatchRow[]): number[] {
  let total = 0;
  return rows.map((r) => {
    total += pts(r.result);
    return total;
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const MAX_PICK = 10;

const PICK_COLORS = [
  'var(--brand)',
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  '#8b5cf6',
  '#ec4899',
  '#0d9488',
  '#ea580c',
  '#06b6d4',
  'var(--text-muted)',
];

interface SeasonStats {
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  winRate: number | null;
  points: number | null;
}

interface StageRow {
  season: string;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  xg: number | null;
  xga: number | null;
  pts: number;
}

type StageSortKey = 'season' | 'w' | 'd' | 'l' | 'gf' | 'ga' | 'gd' | 'xg' | 'xga' | 'pts';

const STAGE_SORT: Record<StageSortKey, (r: StageRow) => number | string> = {
  season: (r) => r.season,
  w: (r) => r.w,
  d: (r) => r.d,
  l: (r) => r.l,
  gf: (r) => r.gf,
  ga: (r) => r.ga,
  gd: (r) => r.gd,
  xg: (r) => r.xg ?? -Infinity,
  xga: (r) => r.xga ?? -Infinity,
  pts: (r) => r.pts,
};

export function CompareDashboard({ matches }: { matches: MatchRow[] }) {
  const { t } = useI18n();

  const plBySeason = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of matches) {
      if (m.competition !== 'Premier League') continue;
      if (m.result !== 'W' && m.result !== 'D' && m.result !== 'L') continue;
      const arr = map.get(m.season);
      if (arr) arr.push(m);
      else map.set(m.season, [m]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [matches]);

  const seasons = useMemo(() => Array.from(plBySeason.keys()).sort(), [plBySeason]);
  const latestSeason = seasons[seasons.length - 1] ?? '';
  const latestPlayed = plBySeason.get(latestSeason)?.length ?? 0;
  const maxN = useMemo(
    () => Math.max(1, ...Array.from(plBySeason.values()).map((a) => a.length)),
    [plBySeason],
  );

  const [n, setN] = useState(latestPlayed > 0 ? latestPlayed : 1);
  const [showAll, setShowAll] = useState(true);
  const [sort, setSort] = useState<{ key: StageSortKey; dir: 'asc' | 'desc' }>({
    key: 'pts',
    dir: 'desc',
  });
  const [picked, setPicked] = useState<string[]>(() =>
    [seasons[seasons.length - 2], latestSeason].filter((s): s is string => Boolean(s)),
  );

  const togglePick = (s: string) =>
    setPicked((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s)
        : prev.length < MAX_PICK
          ? [...prev, s]
          : prev,
    );

  const cumMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const [s, arr] of plBySeason) map.set(s, cumPoints(arr));
    return map;
  }, [plBySeason]);

  // ---- same-stage view ----

  const stageRows = useMemo<StageRow[]>(() => {
    const rows: StageRow[] = [];
    for (const [season, arr] of plBySeason) {
      if (arr.length < n) continue;
      const slice = arr.slice(0, n);
      let w = 0;
      let d = 0;
      let l = 0;
      let gf = 0;
      let ga = 0;
      let xg = 0;
      let xga = 0;
      let xgCount = 0;
      for (const m of slice) {
        if (m.result === 'W') w++;
        else if (m.result === 'D') d++;
        else l++;
        gf += m.gf ?? 0;
        ga += m.ga ?? 0;
        if (m.xg != null && m.xga != null) {
          xg += m.xg;
          xga += m.xga;
          xgCount++;
        }
      }
      rows.push({
        season,
        w,
        d,
        l,
        gf,
        ga,
        gd: gf - ga,
        xg: xgCount === n ? xg : null,
        xga: xgCount === n ? xga : null,
        pts: w * 3 + d,
      });
    }
    const get = STAGE_SORT[sort.key];
    rows.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      const ordered = sort.dir === 'asc' ? cmp : -cmp;
      return ordered || b.pts - a.pts || a.season.localeCompare(b.season);
    });
    return rows;
  }, [plBySeason, n, sort]);

  const toggleStageSort = (key: StageSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'season' ? 'asc' : 'desc' },
    );

  const ptsRanked = useMemo(
    () =>
      [...stageRows].sort(
        (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.season.localeCompare(b.season),
      ),
    [stageRows],
  );

  const rankOfLatest = useMemo(() => {
    const idx = ptsRanked.findIndex((r) => r.season === latestSeason);
    return idx === -1 ? null : idx + 1;
  }, [ptsRanked, latestSeason]);

  const latestRow = stageRows.find((r) => r.season === latestSeason) ?? null;
  const bestRow = ptsRanked[0] ?? null;
  const worstRow = ptsRanked[ptsRanked.length - 1] ?? null;
  const medianPts = useMemo(() => median(stageRows.map((r) => r.pts)), [stageRows]);

  const paceData = useMemo(() => {
    return Array.from({ length: maxN }, (_, i) => {
      const row: Record<string, number | null> = { match: i + 1 };
      const vals: number[] = [];
      for (const [s, cum] of cumMap) {
        const v = cum[i];
        if (v != null) {
          row[s] = v;
          vals.push(v);
        }
      }
      row.__median = median(vals);
      return row;
    });
  }, [cumMap, maxN]);

  // ---- per-season stats at the selected stage ----

  const statsBySeason = useMemo(() => {
    const map = new Map<string, SeasonStats>();
    for (const s of picked) {
      const rows = plBySeason.get(s) ?? [];
      const slice = rows.slice(0, n);
      const w = slice.filter((m) => m.result === 'W').length;
      const d = slice.filter((m) => m.result === 'D').length;
      const l = slice.filter((m) => m.result === 'L').length;
      const gf = slice.reduce((sum, m) => sum + (m.gf ?? 0), 0);
      const ga = slice.reduce((sum, m) => sum + (m.ga ?? 0), 0);
      const total = slice.length;
      map.set(s, {
        w,
        d,
        l,
        gf,
        ga,
        gd: gf - ga,
        winRate: total > 0 ? w / total : null,
        points: total > 0 ? w * 3 + d : null,
      });
    }
    return map;
  }, [picked, plBySeason, n]);

  const axisTick = { fill: 'var(--text-muted)', fontSize: 11 };
  const gridStroke = 'var(--border)';

  function PaceTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const keep = new Set<string>([...(showAll ? ['__median'] : []), ...picked]);
    const entries = payload.filter((e) => keep.has(String(e.dataKey)));
    if (entries.length === 0) return null;
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold text-primary">
          {t('compare.matchweek')} {label}
        </p>
        <div className="flex flex-col gap-1">
          {entries.map((entry, idx) => {
            const key = String(entry.dataKey);
            const name = key === '__median' ? t('compare.median') : seasonShort(key);
            const value = entry.value;
            const text =
              typeof value === 'number' && !Number.isNaN(value)
                ? key === '__median'
                  ? fmt(value, 2)
                  : fmt(value, 0)
                : '—';
            return (
              <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? 'var(--text-muted)' }}
                />
                <span className="font-medium">{name}:</span>
                <span className="font-semibold text-primary">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const statItems = [
    { key: 'w', labelKey: 'compare.w', value: (s: SeasonStats) => fmt(s.w, 0) },
    { key: 'd', labelKey: 'compare.d', value: (s: SeasonStats) => fmt(s.d, 0) },
    { key: 'l', labelKey: 'compare.l', value: (s: SeasonStats) => fmt(s.l, 0) },
    { key: 'gf', labelKey: 'table.gf', value: (s: SeasonStats) => fmt(s.gf, 0) },
    { key: 'ga', labelKey: 'table.ga', value: (s: SeasonStats) => fmt(s.ga, 0) },
    { key: 'gd', labelKey: 'table.gd', value: (s: SeasonStats) => signed(s.gd, 0) },
    { key: 'winRate', labelKey: 'compare.winRate', value: (s: SeasonStats) => pct(s.winRate, 1) },
    { key: 'points', labelKey: 'compare.points', value: (s: SeasonStats) => fmt(s.points, 0) },
  ];

  const paceCards = [
    {
      key: 'thisSeason',
      label: `${t('compare.thisSeason')} (${seasonShort(latestSeason)})`,
      value: latestRow ? fmt(latestRow.pts, 0) : '—',
      sub: latestRow ? `${latestRow.w}-${latestRow.d}-${latestRow.l}` : null,
    },
    {
      key: 'rank',
      label: t('compare.rank'),
      value: rankOfLatest != null ? `${rankOfLatest} / ${stageRows.length}` : '—',
      sub: null,
    },
    {
      key: 'best',
      label: t('compare.best'),
      value: bestRow ? fmt(bestRow.pts, 0) : '—',
      sub: bestRow ? seasonShort(bestRow.season) : null,
    },
    {
      key: 'median',
      label: t('compare.median'),
      value: medianPts != null ? fmt(medianPts, 2) : '—',
      sub: null,
    },
    {
      key: 'worst',
      label: t('compare.worst'),
      value: worstRow ? fmt(worstRow.pts, 0) : '—',
      sub: worstRow ? seasonShort(worstRow.season) : null,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="font-display text-xl font-semibold text-primary">{t('compare.title')}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{t('compare.pickSeasons')}</span>
          <span className="text-xs">
            {t('compare.pickedCount')
              .replace('{count}', String(picked.length))
              .replace('{max}', String(MAX_PICK))}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-pressed={showAll}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
              showAll
                ? 'border-transparent bg-brand-soft text-brand'
                : 'border-border bg-surface text-secondary hover:text-primary'
            }`}
          >
            {t('compare.allSeasons')}
          </button>
          {seasons.map((s) => {
            const idx = picked.indexOf(s);
            const active = idx !== -1;
            return (
              <button
                key={s}
                type="button"
                onClick={() => togglePick(s)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                  active
                    ? 'border-transparent bg-surface-elevated text-primary'
                    : 'border-border bg-surface text-secondary hover:text-primary'
                }`}
                style={active ? { boxShadow: `inset 0 0 0 1.5px ${PICK_COLORS[idx]}` } : undefined}
              >
                {active && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: PICK_COLORS[idx] }}
                  />
                )}
                {seasonShort(s)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="stageN" className="text-sm font-medium text-secondary">
            {t('compare.afterN').replace('{n}', String(n))}
          </label>
          <input
            id="stageN"
            type="range"
            min={1}
            max={maxN}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full max-w-xs accent-[var(--brand)]"
          />
          <input
            type="number"
            min={1}
            max={maxN}
            value={n}
            onChange={(e) => {
              const v = Math.round(Number(e.target.value));
              if (!Number.isNaN(v)) setN(Math.min(maxN, Math.max(1, v)));
            }}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary"
          />
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
        <h3 className="mb-1 font-display text-lg font-semibold text-primary">
          {t('compare.stageChartTitle')}
        </h3>
        {showAll && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0 w-4 rounded border-t-2 border-dashed"
                style={{ borderColor: 'var(--text-secondary)' }}
              />
              {t('compare.median')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-chart-neutral opacity-40" />
              {t('compare.allSeasons')}
            </span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={paceData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="match"
              tick={axisTick}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
              label={{
                value: t('compare.matchweek'),
                position: 'insideBottomRight',
                offset: -4,
                style: { fontSize: 10, fill: 'var(--text-muted)' },
              }}
            />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={32}
              domain={[0, 'auto']}
              label={{
                value: t('compare.points'),
                position: 'insideTopLeft',
                offset: 10,
                style: { fontSize: 10, fill: 'var(--text-muted)' },
              }}
            />
            <Tooltip content={PaceTooltip} />
            {showAll &&
              seasons
                .filter((s) => !picked.includes(s))
                .map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke="var(--chart-neutral)"
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
            {showAll && (
              <Line
                type="monotone"
                dataKey="__median"
                name={t('compare.median')}
                stroke="var(--text-secondary)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {picked.map((s, idx) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                name={seasonShort(s)}
                stroke={PICK_COLORS[idx]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: PICK_COLORS[idx] }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted">{t('compare.chartHint')}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {paceCards.map((card) => (
          <div
            key={card.key}
            className="flex flex-col rounded-xl border border-border bg-surface p-3 shadow-sm dark:shadow-none"
          >
            <span className="text-xs font-medium text-muted">{card.label}</span>
            <span className="mt-1 font-body text-2xl font-bold text-primary">{card.value}</span>
            {card.sub && <span className="text-xs text-muted">{card.sub}</span>}
          </div>
        ))}
      </section>

      {picked.length > 0 && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {picked.map((season, idx) => {
            const stats = statsBySeason.get(season);
            if (!stats) return null;
            return (
              <div
                key={season}
                className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none"
              >
                <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-primary">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PICK_COLORS[idx] }}
                  />
                  {t('compare.statTitle').replace('{matchweek}', String(n))} · {season}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col rounded-xl border border-border bg-bg-secondary p-3"
                    >
                      <span className="text-xs font-medium text-muted">{t(item.labelKey)}</span>
                      <span className="mt-1 font-body text-2xl font-bold text-primary">
                        {item.value(stats)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-primary">
            {t('compare.tableTitleN').replace('{n}', String(n))}
          </h3>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr className="divide-x divide-border-light">
                <th className="border-b border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                  <ColTip label="#" tip={t('tip.rank')} align="center" />
                </th>
                {(
                  [
                    { key: 'season', label: t('table.season'), align: 'left', tip: t('tip.season') },
                    { key: 'w', label: t('table.w'), align: 'center', tip: t('tip.w') },
                    { key: 'd', label: t('table.d'), align: 'center', tip: t('tip.d') },
                    { key: 'l', label: t('table.l'), align: 'center', tip: t('tip.l') },
                    { key: 'gf', label: t('table.gf'), align: 'center', tip: t('tip.gf') },
                    { key: 'ga', label: t('table.ga'), align: 'center', tip: t('tip.ga') },
                    { key: 'gd', label: t('table.gd'), align: 'center', tip: t('tip.gd') },
                    { key: 'xg', label: t('table.xg'), align: 'center', tip: t('tip.xg') },
                    { key: 'xga', label: t('table.xga'), align: 'center', tip: t('tip.xga') },
                    { key: 'pts', label: t('table.pts'), align: 'center', tip: t('tip.pts') },
                  ] as { key: StageSortKey; label: string; align: 'left' | 'center'; tip?: string }[]
                ).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleStageSort(col.key)}
                    className={`cursor-pointer border-b border-border px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-bg-secondary ${
                      col.align === 'left' ? 'text-left' : 'text-center'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'left' ? 'justify-start' : 'justify-center'
                      }`}
                    >
                      <ColTip label={col.label} tip={col.tip} align={col.align === 'left' ? 'left' : 'center'} />
                      {sort.key === col.key ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stageRows.map((r, idx) => {
                const pickIdx = picked.indexOf(r.season);
                return (
                  <tr
                    key={r.season}
                    onClick={() => togglePick(r.season)}
                    className={`cursor-pointer divide-x divide-border-light border-b border-border transition-colors hover:bg-bg-secondary ${
                      r.season === latestSeason ? 'bg-brand-soft' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center text-sm text-muted">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-left text-sm font-medium">
                      {pickIdx !== -1 && (
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: PICK_COLORS[pickIdx] }}
                        />
                      )}
                      {r.season}
                      {r.season === latestSeason && (
                        <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          {t('compare.current')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{r.w}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{r.d}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{r.l}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{r.gf}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{r.ga}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">
                      {signed(r.gd, 0)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{fmt(r.xg, 2)}</td>
                    <td className="px-3 py-2.5 text-center text-sm text-secondary">{fmt(r.xga, 2)}</td>
                    <td className="px-3 py-2.5 text-center text-sm font-semibold text-primary">
                      {r.pts}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {latestPlayed < n && (
        <p className="text-xs text-muted">
          {t('compare.notReached')
            .replace('{season}', latestSeason)
            .replace('{played}', String(latestPlayed))
            .replace('{n}', String(n))}
        </p>
      )}

      <footer>
        <p className="text-xs text-muted">{t('compare.note')}</p>
      </footer>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow } from '@/lib/types';
import {
  MANAGERS,
  aggregateManagers,
  ptsOf,
  perMp,
  winPct,
  csPct,
  type ManagerStats,
} from '@/lib/managers';
import { fmt, pct } from '@/lib/format';
import { ColTip } from './ColTip';

export function ManagersClient({ matches }: { matches: MatchRow[] }) {
  const { t, lang } = useI18n();
  const [leagueOnly, setLeagueOnly] = useState(false);
  const stats = useMemo(
    () => aggregateManagers(leagueOnly ? matches.filter((m) => m.competition === 'Premier League') : matches),
    [matches, leagueOnly],
  );
  const [selected, setSelected] = useState<string[]>(['ferguson', 'mourinho', 'ten-hag']);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const chosen = MANAGERS.filter((m) => selected.includes(m.id));
  const label = (id: string) => {
    const m = MANAGERS.find((x) => x.id === id)!;
    const base = lang === 'th' ? m.nameTh : m.name;
    if (MANAGERS.filter((x) => x.name === m.name).length < 2) return base;
    const fy = m.from.slice(0, 4);
    const ty = m.to?.slice(0, 4) ?? '';
    return `${base} ${fy === ty ? fy : `${fy}–${ty}`}`;
  };

  const ptsKey = t('managers.ptsPerMp');
  const pctKey = t('managers.winPct');
  const chartData = chosen.map((m) => {
    const s = stats.get(m.id)!.total;
    return {
      name: label(m.id),
      [ptsKey]: perMp(ptsOf(s), s.mp) ?? 0,
      [pctKey]: (winPct(s) ?? 0) * 100,
      mp: s.mp,
      wdl: `${s.w}–${s.d}–${s.l}`,
    };
  });

  function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const meta = payload[0]?.payload as { mp?: number; wdl?: string };
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold text-primary">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry, idx) => {
            const v = entry.value;
            const text =
              typeof v === 'number' && !Number.isNaN(v)
                ? entry.dataKey === pctKey
                  ? `${fmt(v, 2)}%`
                  : fmt(v, 2)
                : '—';
            const color = entry.color ?? 'var(--text-muted)';
            return (
              <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium" style={{ color }}>{String(entry.name)}:</span>
                <span className="font-semibold text-primary">{text}</span>
              </div>
            );
          })}
        </div>
        {meta?.mp != null && (
          <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-muted">
            {t('table.mp')} {meta.mp} · {meta.wdl}
          </p>
        )}
      </div>
    );
  }

  const row = (s: ManagerStats, indent = false) => (
    <>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">{s.mp}</td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {s.w}–{s.d}–{s.l}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {fmt(perMp(ptsOf(s), s.mp), 2)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {pct(winPct(s), 2)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {fmt(perMp(s.gf, s.mp))} / {fmt(perMp(s.ga, s.mp))}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {pct(csPct(s), 2)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {s.xg != null ? fmt(perMp(s.xg, s.mp)) : '—'}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-secondary">
        {s.xga != null ? fmt(perMp(s.xga, s.mp)) : '—'}
      </td>
    </>
  );

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-8 lg:px-10">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-primary">
            {t('managers.pick')}
          </h2>
          <div
            role="group"
            aria-label={t('managers.scope')}
            className="inline-flex rounded-full border border-border bg-surface p-0.5"
          >
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setLeagueOnly(v)}
                aria-pressed={leagueOnly === v}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                  leagueOnly === v
                    ? 'bg-brand-soft text-brand'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {v ? t('managers.scopeLeague') : t('managers.scopeAll')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {MANAGERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                selected.includes(m.id)
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border bg-surface text-secondary hover:bg-bg-secondary'
              }`}
              aria-pressed={selected.includes(m.id)}
            >
              {label(m.id)}
              {m.interim && (
                <span className="ml-1 text-xs text-muted">
                  ({t('managers.interim')})
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {chosen.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
          <h3 className="mb-2 font-display text-lg font-semibold text-primary">
            {t('managers.chartTitle')}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis
                  yAxisId="pts"
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  domain={[0, 3]}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={ChartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="pts"
                  dataKey={ptsKey}
                  fill="var(--brand)"
                  radius={[4, 4, 0, 0]}
                  label={{
                    position: 'top',
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    formatter: (v) => fmt(Number(v), 2),
                  }}
                />
                <Bar
                  yAxisId="pct"
                  dataKey={pctKey}
                  fill="var(--chart-neutral)"
                  radius={[4, 4, 0, 0]}
                  label={{
                    position: 'top',
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    formatter: (v) => `${fmt(Number(v), 2)}%`,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-primary">
            {t('managers.tableTitle')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-surface-elevated">
              <tr>
                {[
                  { h: t('managers.colManager'), tip: t('tip.manager') },
                  { h: t('managers.colPeriod'), tip: t('tip.period') },
                  { h: t('table.mp'), tip: t('tip.mp') },
                  { h: 'W–D–L', tip: t('tip.wdl') },
                  { h: t('table.ptsPerMp'), tip: t('tip.ptsPerMp') },
                  { h: t('table.winRate'), tip: t('tip.winRate') },
                  { h: 'GF/GA ' + t('managers.perMp'), tip: t('tip.gfGaPerMp') },
                  { h: t('table.csRate'), tip: t('tip.csRate') },
                  { h: 'xG/' + t('managers.perMp'), tip: t('tip.xgPerMp') },
                  { h: 'xGA/' + t('managers.perMp'), tip: t('tip.xgaPerMp') },
                ].map(({ h, tip }, i) => (
                  <th
                    key={i}
                    className={`border-b border-border px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted ${
                      i < 2 ? 'text-left' : 'text-right'
                    }`}
                  >
                    <ColTip label={h} tip={tip} align={i < 2 ? 'left' : 'right'} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chosen.map((m) => {
                const agg = stats.get(m.id)!;
                const s = agg.total;
                const isOpen = expanded === m.id;
                return [
                  <tr
                    key={m.id}
                    onClick={() => setExpanded(isOpen ? null : m.id)}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-bg-secondary"
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-primary">
                      <span className="flex items-center gap-1.5">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {label(m.id)}
                        {m.interim && (
                          <span className="text-xs text-muted">
                            ({t('managers.interim')})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted">
                      {s.mp > 0 ? `${s.first} → ${s.last}` : '—'}
                    </td>
                    {row(s)}
                  </tr>,
                  ...(isOpen
                    ? agg.seasons.map((ss) => (
                        <tr
                          key={`${m.id}-${ss.season}`}
                          className="border-b border-border-light bg-bg-secondary/50"
                        >
                          <td className="px-3 py-2 pl-9 text-sm text-muted">
                            {ss.season}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted">
                            {ss.first} → {ss.last}
                          </td>
                          {row(ss, true)}
                        </tr>
                      ))
                    : []),
                ];
              })}
              {chosen.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted">
                    {t('managers.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

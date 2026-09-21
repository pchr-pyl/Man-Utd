'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipContentProps,
  Legend,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { KeepersData, GkSeasonRow } from '@/lib/types';
import { seasonShort } from '@/lib/stats';
import { fmt, pct, signed } from '@/lib/format';

function sum(values: (number | null | undefined)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

export function KeepersDashboard({ data }: { data: KeepersData }) {
  const { t } = useI18n();
  const { matchLog, perGkSeason, psxg } = data;

  const plBySeason = useMemo(() => {
    const groups = new Map<string, (typeof matchLog)[number][]>();
    for (const r of matchLog) {
      if (r.comp !== 'Premier League') continue;
      const arr = groups.get(r.season) ?? [];
      arr.push(r);
      groups.set(r.season, arr);
    }
    const seasons = Array.from(groups.keys()).sort();
    return seasons.map((season) => {
      const rows = groups.get(season) ?? [];
      const sota = sum(rows.map((r) => r.sota));
      const saves = sum(rows.map((r) => r.saves));
      const ga = sum(rows.map((r) => r.ga));
      const cs = sum(rows.map((r) => r.cs));
      const savePct = sota > 0 ? saves / sota : null;
      return { season, short: seasonShort(season), sota, saves, ga, cs, savePct };
    });
  }, [matchLog]);

  const latestSeason = plBySeason[plBySeason.length - 1] ?? null;

  const latestPsxg = useMemo(() => {
    const rows = psxg
      .filter((r) => r.psxg != null && r.psxgPlusMinus != null)
      .sort((a, b) => a.season.localeCompare(b.season));
    return rows[rows.length - 1] ?? null;
  }, [psxg]);

  const perGk = useMemo(() => {
    const groups = new Map<string | null, GkSeasonRow[]>();
    for (const r of perGkSeason) {
      const arr = groups.get(r.player) ?? [];
      arr.push(r);
      groups.set(r.player, arr);
    }
    const out = Array.from(groups.entries()).map(([player, rows]) => {
      const sota = sum(rows.map((r) => r.sota));
      const saves = sum(rows.map((r) => r.saves));
      const ga = sum(rows.map((r) => r.ga));
      const cs = sum(rows.map((r) => r.cs));
      const mp = sum(rows.map((r) => r.mp));
      const savePct = sota > 0 ? saves / sota : null;
      return { player: player ?? t('keepers.table.otherGk'), mp, sota, saves, ga, cs, savePct };
    });
    out.sort((a, b) => b.sota - a.sota);
    return out;
  }, [perGkSeason, t]);

  const goalsPrevented = useMemo(() => {
    return [...psxg]
      .filter((r) => r.psxg != null)
      .sort((a, b) => a.season.localeCompare(b.season))
      .map((r) => ({
        season: r.season,
        short: seasonShort(r.season),
        ga: r.ga,
        psxg: r.psxg,
        psxgPlusMinus: r.psxgPlusMinus,
      }));
  }, [psxg]);

  const axisTick = { fill: 'var(--text-muted)', fontSize: 11 };
  const gridStroke = 'var(--border)';

  function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold text-primary">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry, idx) => {
            const value = entry.value;
            const dataKey = entry.dataKey as string | undefined;
            let text = '—';
            if (typeof value === 'number' && !Number.isNaN(value)) {
              if (dataKey === 'savePct') {
                text = pct(value, 2);
              } else if (dataKey === 'psxgPlusMinus') {
                text = signed(value, 2);
              } else {
                text = fmt(value, 0);
              }
            }
            const color = entry.color ?? 'var(--text-muted)';
            return (
              <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium" style={{ color }}>
                  {chartLabel(dataKey ?? '')}:
                </span>
                <span className="font-semibold text-primary">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function chartLabel(name: string) {
    switch (name) {
      case 'sota':
        return t('keepers.sota');
      case 'saves':
        return t('keepers.saves');
      case 'ga':
        return t('keepers.ga');
      case 'savePct':
        return t('keepers.savePct');
      case 'psxg':
        return t('keepers.psxg');
      case 'psxgPlusMinus':
        return t('keepers.goalsPrevented');
      default:
        return name;
    }
  }

  const kpi = [
    { label: t('keepers.kpi.saves'), value: fmt(latestSeason?.saves ?? null, 0) },
    {
      label: t('keepers.kpi.savePct'),
      value: latestSeason?.savePct != null ? pct(latestSeason.savePct, 2) : '—',
    },
    { label: t('keepers.kpi.cs'), value: fmt(latestSeason?.cs ?? null, 0) },
    {
      label: t('keepers.kpi.goalsPrevented'),
      value: latestPsxg ? signed(latestPsxg.psxgPlusMinus, 2) : '—',
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section className="flex min-w-0 flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-primary">{t('keepers.title')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpi.map((k) => (
            <div
              key={k.label}
              className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none"
            >
              <span className="text-xs font-medium text-muted">{k.label}</span>
              <span className="mt-2 font-body text-3xl font-bold text-primary">{k.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={t('keepers.chart.bySeason')}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={plBySeason} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="short"
                tick={axisTick}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={ChartTooltip} />
              <Legend formatter={(value) => chartLabel(String(value))} wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="sota"
                name="sota"
                stroke="#0d9488"
                fill="#0d9488"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="saves"
                name="saves"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#8b5cf6' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ga"
                name="ga"
                stroke="var(--danger)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--danger)' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('keepers.chart.perGk')}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={perGk} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="player"
                tick={{ ...axisTick, fontSize: 10 }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={[0, 1]}
                tickFormatter={(v: number) => pct(v, 0)}
              />
              <Tooltip content={ChartTooltip} />
              <Legend formatter={(value) => chartLabel(String(value))} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="sota"
                name="sota"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="ga"
                name="ga"
                fill="var(--danger)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="savePct"
                name="savePct"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('keepers.chart.goalsPrevented')}>
          <p className="mb-3 text-xs text-muted">{t('keepers.goalsPreventedNote')}</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={goalsPrevented} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="short"
                tick={axisTick}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={ChartTooltip} />
              <Legend formatter={(value) => chartLabel(String(value))} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="ga"
                name="ga"
                fill="var(--danger)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="psxg"
                name="psxg"
                fill="var(--info)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="psxgPlusMinus"
                name="psxgPlusMinus"
                stroke="var(--chart-neutral)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--chart-neutral)' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <h3 className="mb-3 font-display text-lg font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );
}

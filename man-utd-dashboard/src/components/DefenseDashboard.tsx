'use client';

import { Fragment, useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { SeasonRow, AttackBySeason, KeepersData, GkSeasonRow } from '@/lib/types';
import { fmt, pct, dash } from '@/lib/format';
import { KeepersDashboard } from './KeepersDashboard';
import { ColTip } from './ColTip';

type DefSortKey = 'season' | 'mp' | 'ga' | 'gaPerMp' | 'xga' | 'sota' | 'sotaPerMp' | 'saves' | 'savePct' | 'cs' | 'csPct';
type SortDir = 'asc' | 'desc';

interface DefRow {
  season: string;
  mp: number | null;
  ga: number | null;
  gaPerMp: number | null;
  xga: number | null;
  sota: number | null;
  sotaPerMp: number | null;
  saves: number | null;
  savePct: number | null;
  cs: number | null;
  csPct: number | null;
  plMp: number | null;
}

function sum(values: (number | null | undefined)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

export function DefenseDashboard({
  rows,
  attack,
  attackLeague,
  keepers,
}: {
  rows: SeasonRow[];
  attack: AttackBySeason;
  attackLeague: AttackBySeason;
  keepers: KeepersData;
}) {
  const { t } = useI18n();
  const [leagueOnly, setLeagueOnly] = useState(false);
  const [defSort, setDefSort] = useState<{ key: DefSortKey; dir: SortDir }>({ key: 'season', dir: 'desc' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (season: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(season)) next.delete(season);
      else next.add(season);
      return next;
    });

  const gkBySeason = useMemo(() => {
    const groups = new Map<string, GkSeasonRow[]>();
    for (const r of keepers.perGkSeason) {
      const arr = groups.get(r.season) ?? [];
      arr.push(r);
      groups.set(r.season, arr);
    }
    const out = new Map<string, { gks: GkSeasonRow[]; saves: number; savePct: number | null }>();
    for (const [season, gks] of groups) {
      gks.sort((a, b) => (b.mp ?? 0) - (a.mp ?? 0));
      const sota = sum(gks.map((r) => r.sota));
      const saves = sum(gks.map((r) => r.saves));
      out.set(season, { gks, saves, savePct: sota > 0 ? (saves / sota) * 100 : null });
    }
    return out;
  }, [keepers.perGkSeason]);

  const defData = useMemo<DefRow[]>(() => {
    const allComp = new Map<string, SeasonRow>();
    const pl = new Map<string, SeasonRow>();
    for (const r of rows) {
      if (r.competition === 'All Competitions') allComp.set(r.season, r);
      if (r.competition === 'Premier League') pl.set(r.season, r);
    }
    const scoped = leagueOnly ? attackLeague : attack;
    return Object.keys(scoped)
      .sort()
      .map((season) => {
        const plRow = pl.get(season);
        const src = leagueOnly ? plRow : allComp.get(season);
        const mp = src?.mp ?? null;
        const ga = src?.ga ?? null;
        const cs = src?.cs ?? null;
        const sota = plRow?.sota ?? null;
        const plMp = plRow?.mp ?? null;
        const gk = gkBySeason.get(season);
        return {
          season,
          mp,
          ga,
          gaPerMp: ga != null && mp ? ga / mp : null,
          xga: plRow?.xga ?? null,
          sota,
          sotaPerMp: sota != null && plMp ? sota / plMp : null,
          saves: gk?.saves ?? null,
          savePct: gk?.savePct ?? null,
          cs,
          csPct: cs != null && mp ? cs / mp : null,
          plMp,
        };
      });
  }, [attack, attackLeague, rows, leagueOnly, gkBySeason]);

  const defSorted = useMemo(() => {
    const copy = [...defData];
    copy.sort((a, b) => {
      const av = defSort.key === 'season' ? a.season : a[defSort.key];
      const bv = defSort.key === 'season' ? b.season : b[defSort.key];
      const an = av == null ? (defSort.key === 'season' ? '' : -Infinity) : av;
      const bn = bv == null ? (defSort.key === 'season' ? '' : -Infinity) : bv;
      const cmp =
        typeof an === 'number' && typeof bn === 'number'
          ? an - bn
          : String(an).localeCompare(String(bn));
      return defSort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [defData, defSort]);

  const toggleDefSort = (key: DefSortKey) =>
    setDefSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const defColumns: { key: DefSortKey; label: string; tip?: string }[] = [
    { key: 'season', label: t('table.season'), tip: t('tip.season') },
    { key: 'mp', label: 'MP', tip: t('tip.mp') },
    { key: 'ga', label: 'GA', tip: t('tip.ga') },
    { key: 'gaPerMp', label: 'GA/MP', tip: t('tip.gaPerMp') },
    { key: 'xga', label: 'xGA', tip: t('tip.xga') },
    { key: 'sota', label: 'SoTA', tip: t('tip.sota') },
    { key: 'sotaPerMp', label: 'SoTA/MP', tip: t('tip.sotaPerMp') },
    { key: 'saves', label: t('keepers.table.saves'), tip: t('tip.saves') },
    { key: 'savePct', label: t('keepers.table.savePct'), tip: t('tip.savePct') },
    { key: 'cs', label: 'CS', tip: t('tip.cs') },
    { key: 'csPct', label: 'CS%', tip: t('tip.csPct') },
  ];

  const latest = defData[defData.length - 1];

  const kpi = [
    { label: t('kpi.gaPerMp'), value: fmt(latest?.gaPerMp ?? null, 2) },
    {
      label: t('kpi.xgaPerMp'),
      value: latest?.xga != null && latest.plMp ? fmt(latest.xga / latest.plMp, 2) : '—',
    },
    {
      label: t('kpi.sotaPerMp'),
      value: latest?.sota != null && latest.plMp ? fmt(latest.sota / latest.plMp, 2) : '—',
    },
    { label: t('kpi.csRate'), value: latest?.csPct != null ? pct(latest.csPct, 1) : '—' },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-8 lg:px-10">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-primary">{t('defense.title')}</h2>
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
        <p className="text-xs text-muted">{t('defense.table.note')}</p>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-primary">{t('defense.table.title')}</h3>
          <p className="text-xs text-muted">
            {t('keepers.table.hint')} · {t('keepers.table.coverage')}
          </p>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr className="divide-x divide-border-light">
                <th className="w-8 border-b border-border px-2 py-3" />
                {defColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleDefSort(col.key)}
                    className={`cursor-pointer border-b border-border px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-bg-secondary ${col.key === 'season' ? 'text-left' : 'text-right'}`}
                  >
                    <div className={`flex items-center gap-1 ${col.key === 'season' ? 'justify-start' : 'justify-end'}`}>
                      <ColTip label={col.label} tip={col.tip} align={col.key === 'season' ? 'left' : 'right'} />
                      {defSort.key === col.key ? (defSort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} className="opacity-30" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defSorted.map((r) => {
                const gk = gkBySeason.get(r.season);
                const isOpen = expanded.has(r.season);
                return (
                  <Fragment key={r.season}>
                    <tr
                      onClick={gk ? () => toggleExpand(r.season) : undefined}
                      className={`divide-x divide-border-light border-b border-border transition-colors hover:bg-bg-secondary ${gk ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-2 py-3 text-center text-muted">
                        {gk ? (isOpen ? <ChevronDown size={14} className="inline" /> : <ChevronRight size={14} className="inline" />) : null}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-primary">{r.season}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.mp, 0)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.ga, 0)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.gaPerMp, 2)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.xga, 2)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.sota, 0)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.sotaPerMp, 2)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.saves, 0)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{r.savePct != null ? pct(r.savePct / 100, 2) : '—'}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{fmt(r.cs, 0)}</td>
                      <td className="px-3 py-3 text-right text-sm text-secondary">{r.csPct != null ? pct(r.csPct, 1) : '—'}</td>
                    </tr>
                    {isOpen && gk && (
                      <tr className="border-b border-border bg-bg-secondary">
                        <td />
                        <td colSpan={defColumns.length} className="px-3 py-3">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                                <th className="py-1 pr-3"><ColTip label={t('keepers.table.player')} tip={t('tip.player')} /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.mp')} tip={t('tip.mp')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.min')} tip={t('tip.min')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.ga')} tip={t('tip.ga')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.gaPerMp')} tip={t('tip.gaPerMp')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.sota')} tip={t('tip.sota')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.saves')} tip={t('tip.saves')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.savePct')} tip={t('tip.savePct')} align="right" /></th>
                                <th className="py-1 pr-3 text-right"><ColTip label={t('keepers.table.cs')} tip={t('tip.cs')} align="right" /></th>
                                <th className="py-1 text-right"><ColTip label={t('keepers.table.csPct')} tip={t('tip.csPct')} align="right" /></th>
                              </tr>
                            </thead>
                            <tbody>
                              {gk.gks.map((g) => (
                                <tr key={`${r.season}-${g.player}`} className="text-sm">
                                  <td className="py-1.5 pr-3 font-medium text-primary">{g.player ? dash(g.player) : t('keepers.table.otherGk')}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.mp, 0)}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.min, 0)}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.ga, 0)}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">
                                    {g.ga != null && g.mp ? fmt(g.ga / g.mp, 2) : '—'}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.sota, 0)}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.saves, 0)}</td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">
                                    {g.savePct != null ? pct(g.savePct / 100, 2) : '—'}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right text-secondary">{fmt(g.cs, 0)}</td>
                                  <td className="py-1.5 text-right text-secondary">
                                    {g.cs != null && g.mp ? pct(g.cs / g.mp, 2) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <KeepersDashboard data={keepers} />
    </main>
  );
}

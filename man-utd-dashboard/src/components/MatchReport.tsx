'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow, SeasonMatchlogs } from '@/lib/types';
import {
  awayScore,
  awayTeamName,
  buildComparisons,
  homeScore,
  homeTeamName,
  isCompleted,
  isUnitedHome,
  type StatComparison,
} from '@/lib/matchReport';
import { COMP_SHORT, RESULT_STYLE, formatDate } from './matchlog-shared';
import { dash } from '@/lib/format';

export interface MatchNav {
  date: string;
  opponent: string | null;
}

function fmtVal(v: number | null, decimals: number, suffix?: string): string {
  if (v == null) return '—';
  return `${v.toFixed(decimals)}${suffix ?? ''}`;
}

function ComparisonRow({
  comp,
  utdOnLeft,
}: {
  comp: StatComparison;
  utdOnLeft: boolean;
}) {
  const { t } = useI18n();
  const { home, away, decimals, suffix } = comp;
  const total = (home ?? 0) + (away ?? 0);
  const homeShare = total > 0 && home != null ? home / total : 0;
  const awayShare = total > 0 && away != null ? away / total : 0;
  const leftColor = utdOnLeft ? 'bg-brand' : 'bg-chart-neutral';
  const rightColor = utdOnLeft ? 'bg-chart-neutral' : 'bg-brand';
  const homeWins = home != null && (away == null || home > away);
  const awayWins = away != null && (home == null || away > home);

  return (
    <div className="px-4 py-2.5">
      <div className="grid grid-cols-[minmax(3rem,1fr)_auto_minmax(3rem,1fr)] items-baseline gap-3">
        <span
          className={`text-sm font-semibold tabular-nums ${
            homeWins ? 'text-primary' : 'text-secondary'
          }`}
        >
          {fmtVal(home, decimals, suffix)}
        </span>
        <span className="text-center text-xs text-muted">
          {t(`match.stat.${comp.key}`)}
        </span>
        <span
          className={`text-right text-sm font-semibold tabular-nums ${
            awayWins ? 'text-primary' : 'text-secondary'
          }`}
        >
          {fmtVal(away, decimals, suffix)}
        </span>
      </div>
      {total > 0 && (
        <div className="mt-1.5 flex h-[3px] gap-1">
          <div className="flex-1 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className={`ml-auto h-full rounded-full ${leftColor}`}
              style={{ width: `${homeShare * 100}%` }}
            />
          </div>
          <div className="flex-1 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className={`h-full rounded-full ${rightColor}`}
              style={{ width: `${awayShare * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function FixtureCard({ match, titleKey }: { match: MatchRow; titleKey: string }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/matches/${match.date}`}
      className="block rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm transition-colors hover:bg-bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-semibold text-primary">
          {t(titleKey)}
        </span>
        <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted">
          {COMP_SHORT[match.competition] ?? match.competition}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-primary">
          {homeTeamName(match)} vs {awayTeamName(match)}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {formatDate(match.date)}
          {match.time ? ` · ${match.time}` : ''}
        </span>
      </div>
    </Link>
  );
}

export function MatchReport({
  match,
  matchlogs,
  prev,
  next,
}: {
  match: MatchRow;
  matchlogs: SeasonMatchlogs | null;
  prev?: MatchNav | null;
  next?: MatchNav | null;
}) {
  const { t } = useI18n();
  const completed = isCompleted(match);
  const utdHome = isUnitedHome(match);
  const home = homeTeamName(match);
  const away = awayTeamName(match);
  const comparisons = completed ? buildComparisons(match, matchlogs) : [];

  const score =
    completed && homeScore(match) != null && awayScore(match) != null
      ? `${homeScore(match)}–${awayScore(match)}${
          match.gfPens != null && match.gaPens != null
            ? ` (${isUnitedHome(match) ? match.gfPens : match.gaPens}–${
                isUnitedHome(match) ? match.gaPens : match.gfPens
              } p)`
            : ''
        }`
      : 'VS';

  const details: Array<{ key: string; value: string | number | null }> = [
    { key: 'round', value: match.round },
    { key: 'venue', value: match.venue ? t(`matchLog.venue.${match.venue}`) : null },
    { key: 'referee', value: match.referee },
    {
      key: 'attendance',
      value: match.attendance != null ? match.attendance.toLocaleString() : null,
    },
    { key: 'captain', value: match.captain },
    { key: 'formation', value: match.formation },
    { key: 'oppFormation', value: match.oppFormation },
    { key: 'notes', value: match.notes },
  ].filter((d) => d.value != null && d.value !== '');

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/matches"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <ChevronLeft size={16} />
          {t('match.back')}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {prev && (
            <Link
              href={`/matches/${prev.date}`}
              className="inline-flex items-center gap-1 text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">{dash(prev.opponent)}</span>
              <span className="tabular-nums">{formatDate(prev.date)}</span>
            </Link>
          )}
          {next && (
            <Link
              href={`/matches/${next.date}`}
              className="inline-flex items-center gap-1 text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="tabular-nums">{formatDate(next.date)}</span>
              <span className="hidden sm:inline">{dash(next.opponent)}</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted">
          <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            {COMP_SHORT[match.competition] ?? match.competition}
          </span>
          <span>{match.competition}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatDate(match.date)}</span>
          {match.time && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{match.time}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-6 sm:gap-6 sm:px-8">
          <div className="min-w-0 text-right">
            <p className="truncate font-display text-lg font-bold leading-tight text-primary sm:text-2xl">
              {home}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              {t('match.home')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="whitespace-nowrap font-display text-3xl font-bold tabular-nums text-primary sm:text-4xl">
              {score}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                completed
                  ? (RESULT_STYLE[match.result ?? ''] ?? 'bg-bg-secondary text-muted')
                  : 'bg-info-soft text-info'
              }`}
            >
              {completed
                ? `${match.result} · ${t('match.fullTime')}`
                : t('match.scheduled')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight text-primary sm:text-2xl">
              {away}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              {t('match.away')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-primary">
            {t('match.overview')}
          </h2>
          {comparisons.length > 0 && (
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-[11px] font-medium uppercase tracking-wider text-muted">
              <span className="truncate">{home}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${utdHome ? 'bg-brand' : 'bg-chart-neutral'}`}
                  aria-hidden="true"
                />
                {t('match.legend')}
                <span
                  className={`inline-block h-2 w-2 rounded-full ${utdHome ? 'bg-chart-neutral' : 'bg-brand'}`}
                  aria-hidden="true"
                />
              </span>
              <span className="truncate text-right">{away}</span>
            </div>
          )}
        </div>
        {comparisons.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">{t('match.noStats')}</p>
        ) : (
          <div className="divide-y divide-border-light">
            {comparisons.map((comp) => (
              <ComparisonRow key={comp.key} comp={comp} utdOnLeft={utdHome} />
            ))}
          </div>
        )}
      </section>

      {details.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm dark:shadow-none">
          <h2 className="mb-1 font-display text-lg font-semibold text-primary">
            {t('match.details')}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {details.map(({ key, value }) => (
              <div key={key} className={key === 'notes' ? 'col-span-full' : ''}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  {t(`match.${key}`)}
                </dt>
                <dd className="text-sm text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}

'use client';

import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { MatchRow } from '@/lib/types';
import type { MatchDetail, MatchShot, RosterPlayer, GoalEvent } from '@/lib/understat';
import { goalEvents, unitedSide } from '@/lib/understat';
import { homeTeamName, awayTeamName } from '@/lib/matchReport';
import { fmt } from '@/lib/format';

const UTD_COLOR = 'var(--brand)';
const OPP_COLOR = 'var(--chart-neutral)';

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm dark:shadow-none">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function GoalTimeline({
  goals,
  homeName,
  awayName,
}: {
  goals: GoalEvent[];
  homeName: string;
  awayName: string;
}) {
  const { t } = useI18n();
  return (
    <ul className="divide-y divide-border-light">
      {goals.map((g, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-10 shrink-0 rounded bg-bg-secondary px-1 py-0.5 text-center text-xs font-bold tabular-nums text-primary">
            {g.minute}&prime;
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-primary">
              {g.player}
              {g.og && (
                <span className="ml-1 rounded bg-warning-soft px-1 py-0.5 text-[10px] font-semibold text-warning">
                  {t('match.og')}
                </span>
              )}
            </span>
            {g.assist && (
              <span className="block truncate text-xs text-muted">
                {t('match.assist')} {g.assist}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {g.side === 'h' ? homeName : awayName}
          </span>
          <span className="w-10 shrink-0 text-right font-display text-sm font-bold tabular-nums text-primary">
            {g.score}
          </span>
        </li>
      ))}
    </ul>
  );
}

function XgFlowChart({
  shots,
  homeName,
  awayName,
  homeColor,
  awayColor,
}: {
  shots: MatchShot[];
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
}) {
  const { t } = useI18n();
  const sorted = [...shots]
    .filter((s) => s.result !== 'OwnGoal')
    .sort((x, y) => x.minute - y.minute);
  const data: Array<{ minute: number; home: number; away: number }> = [
    { minute: 0, home: 0, away: 0 },
  ];
  let ch = 0;
  let ca = 0;
  for (const s of sorted) {
    if (s.h_a === 'h') ch += s.xG;
    else ca += s.xG;
    data.push({
      minute: s.minute,
      home: Number(ch.toFixed(3)),
      away: Number(ca.toFixed(3)),
    });
  }
  const last = sorted[sorted.length - 1];
  if (last && last.minute < 90) {
    data.push({ minute: 90, home: Number(ch.toFixed(3)), away: Number(ca.toFixed(3)) });
  }

  function Tip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold text-primary">{label}&prime;</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-secondary">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium" style={{ color: entry.color }}>
                {String(entry.name)}:
              </span>
              <span className="tabular-nums text-primary">
                {fmt(typeof entry.value === 'number' ? entry.value : null, 2)} xG
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="minute"
            type="number"
            domain={[0, 95]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}'`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip content={Tip} />
          <Line
            type="stepAfter"
            dataKey="home"
            name={homeName}
            stroke={homeColor}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="stepAfter"
            dataKey="away"
            name={awayName}
            stroke={awayColor}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: homeColor }} />
          {homeName} {fmt(ch, 2)} xG
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: awayColor }} />
          {awayName} {fmt(ca, 2)} xG
        </span>
      </div>
      <p className="sr-only">{t('match.xgFlow')}</p>
    </div>
  );
}

function ShotMap({
  shots,
  homeName,
  awayName,
  homeColor,
  awayColor,
}: {
  shots: MatchShot[];
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
}) {
  const { t } = useI18n();
  const W = 105;
  const H = 68;
  const toX = (s: MatchShot) => (s.h_a === 'h' ? s.X * W : (1 - s.X) * W);
  const toY = (s: MatchShot) => (s.h_a === 'h' ? s.Y * H : (1 - s.Y) * H);
  const dot = (s: MatchShot, i: number) => {
    const isGoal = s.result === 'Goal' || s.result === 'OwnGoal';
    const color = s.h_a === 'h' ? homeColor : awayColor;
    const r = 1.1 + Math.min(s.xG, 0.95) * 6;
    return (
      <circle
        key={i}
        cx={toX(s)}
        cy={toY(s)}
        r={isGoal ? r + 0.5 : r}
        fill={isGoal ? 'var(--success)' : color}
        fillOpacity={isGoal ? 0.95 : 0.35 + Math.min(s.xG * 1.6, 0.5)}
        stroke={isGoal ? 'var(--success)' : 'transparent'}
        strokeWidth={0.5}
      >
        <title>{`${s.minute}' ${s.player} — ${fmt(s.xG, 2)} xG`}</title>
      </circle>
    );
  };

  return (
    <div className="px-4 py-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg bg-bg-secondary"
        role="img"
        aria-label={t('match.shotMap')}
      >
        <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        <line x1={W / 2} y1={1} x2={W / 2} y2={H - 1} stroke="var(--border)" strokeWidth={0.6} />
        <circle cx={W / 2} cy={H / 2} r={9.15} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        <rect x={1} y={H / 2 - 20.16} width={16.5} height={40.32} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        <rect x={W - 17.5} y={H / 2 - 20.16} width={16.5} height={40.32} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        <rect x={1} y={H / 2 - 9.16} width={5.5} height={18.32} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        <rect x={W - 6.5} y={H / 2 - 9.16} width={5.5} height={18.32} fill="none" stroke="var(--border)" strokeWidth={0.6} />
        {shots.map(dot)}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: homeColor }} />
          {homeName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: awayColor }} />
          {awayName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
          {t('match.goal')}
        </span>
        <span>{t('match.shotSize')}</span>
      </div>
    </div>
  );
}

function PlayerBadges({ p, subMinute }: { p: RosterPlayer; subMinute?: number | null }) {
  const { t } = useI18n();
  return (
    <span className="flex shrink-0 items-center gap-1">
      {p.goals > 0 && (
        <span className="rounded bg-success-soft px-1 py-0.5 text-[10px] font-bold text-success">
          {p.goals} {t('match.shortGoal')}
        </span>
      )}
      {p.assists > 0 && (
        <span className="rounded bg-info-soft px-1 py-0.5 text-[10px] font-bold text-info">
          {p.assists} {t('match.shortAssist')}
        </span>
      )}
      {p.yellow > 0 && (
        <span className="inline-block h-3 w-2 rounded-[2px] bg-warning" title={t('match.stat.crdY')} />
      )}
      {p.red > 0 && (
        <span className="inline-block h-3 w-2 rounded-[2px] bg-danger" title={t('match.stat.crdR')} />
      )}
      {subMinute != null && (
        <span className="text-[10px] tabular-nums text-muted">{subMinute}&prime;</span>
      )}
    </span>
  );
}

function LineupColumn({
  players,
  teamName,
}: {
  players: RosterPlayer[];
  teamName: string;
}) {
  const { t } = useI18n();
  const byId = new Map(players.map((p) => [p.id, p]));
  const starters = players.filter((p) => p.position !== 'Sub').sort((a, b) => a.order - b.order);
  const subs = players.filter((p) => p.position === 'Sub').sort((a, b) => a.order - b.order);
  const subMinute = (p: RosterPlayer) =>
    p.subInFor ? (byId.get(p.subInFor)?.minutes ?? null) : null;

  return (
    <div className="min-w-0">
      <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {teamName}
      </p>
      <ul className="divide-y divide-border-light">
        {starters.map((p) => (
          <li key={p.id} className="flex items-center gap-2 px-4 py-1.5">
            <span className="w-8 shrink-0 text-[10px] font-semibold text-muted">{p.position}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-primary">{p.name}</span>
            <PlayerBadges p={p} />
          </li>
        ))}
        {subs.length > 0 && (
          <li className="bg-bg-secondary px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t('match.subs')}
          </li>
        )}
        {subs.map((p) => (
          <li key={p.id} className="flex items-center gap-2 px-4 py-1.5">
            <span className="w-8 shrink-0 text-[10px] font-semibold text-muted">{t('match.sub')}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-secondary">{p.name}</span>
            <PlayerBadges p={p} subMinute={subMinute(p)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchDetailSections({
  match,
  detail,
}: {
  match: MatchRow;
  detail: MatchDetail;
}) {
  const { t } = useI18n();
  const us = unitedSide(match, detail);
  const homeName = homeTeamName(match);
  const awayName = awayTeamName(match);
  const homeColor = us === 'h' ? UTD_COLOR : OPP_COLOR;
  const awayColor = us === 'h' ? OPP_COLOR : UTD_COLOR;

  const goals = goalEvents(detail.shots);
  const hasShots = detail.shots.length > 0;
  const hasRosters = detail.home.length > 0 || detail.away.length > 0;

  return (
    <>
      {goals.length > 0 && (
        <Card title={t('match.goals')} sub={t('match.goalsSub')}>
          <GoalTimeline goals={goals} homeName={homeName} awayName={awayName} />
        </Card>
      )}

      {hasShots && (
        <Card title={t('match.xgFlow')} sub={t('match.xgFlowSub')}>
          <XgFlowChart
            shots={detail.shots}
            homeName={homeName}
            awayName={awayName}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        </Card>
      )}

      {hasShots && (
        <Card
          title={t('match.shotMap')}
          sub={`${detail.shots.length} ${t('match.shotsCount')}`}
        >
          <ShotMap
            shots={detail.shots}
            homeName={homeName}
            awayName={awayName}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        </Card>
      )}

      {hasRosters && (
        <Card title={t('match.lineups')}>
          <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-border">
            <LineupColumn players={detail.home} teamName={homeName} />
            <LineupColumn players={detail.away} teamName={awayName} />
          </div>
        </Card>
      )}
    </>
  );
}

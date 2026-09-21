import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { getMatches, getMatchlogs, getSeasonRows, getMatchDetail } from '@/lib/data';
import { isCompleted } from '@/lib/matchReport';
import { seasonShort } from '@/lib/stats';
import { AppHeader } from '@/components/AppHeader';
import { FixtureCard, MatchReport } from '@/components/MatchReport';

export default async function LastMatchPage() {
  await connection();
  const [matches, rows] = await Promise.all([getMatches(), getSeasonRows()]);

  let latestIdx = -1;
  matches.forEach((m, i) => {
    if (isCompleted(m)) latestIdx = i;
  });
  const match = latestIdx >= 0 ? matches[latestIdx] : undefined;
  if (!match) notFound();

  const [matchlogs, detail] = await Promise.all([
    getMatchlogs(match.season),
    getMatchDetail(match.date),
  ]);
  const prev = latestIdx > 0 ? matches[latestIdx - 1] : null;
  const upcoming = matches.find((m, i) => i > latestIdx && !isCompleted(m));

  const allRows = rows.filter((r) => r.competition === 'All Competitions');
  const sorted = [...allRows].sort((a, b) => a.season.localeCompare(b.season));
  const first = sorted[0]?.season ?? '';
  const last = sorted[sorted.length - 1]?.season ?? '';
  const seasonRange = first && last ? `${seasonShort(first)} – ${seasonShort(last)}` : '';

  return (
    <div className="hero-glow relative flex min-h-screen flex-col bg-bg">
      <AppHeader seasonRange={seasonRange} />
      <MatchReport
        match={match}
        matchlogs={matchlogs}
        detail={detail}
        prev={prev ? { date: prev.date, opponent: prev.opponent } : null}
      />
      {upcoming && (
        <div className="mx-auto w-full max-w-[960px] px-4 pb-8 sm:px-6 lg:px-10">
          <FixtureCard match={upcoming} titleKey="match.next" />
        </div>
      )}
    </div>
  );
}

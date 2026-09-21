import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { getMatches, getMatchlogs, getSeasonRows } from '@/lib/data';
import { seasonShort } from '@/lib/stats';
import { AppHeader } from '@/components/AppHeader';
import { MatchReport } from '@/components/MatchReport';

export default async function MatchPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  await connection();
  const { date } = await params;
  const [matches, rows] = await Promise.all([getMatches(), getSeasonRows()]);
  const idx = matches.findIndex((m) => m.date === date);
  const match = idx >= 0 ? matches[idx] : undefined;
  if (!match) notFound();

  const matchlogs = await getMatchlogs(match.season);
  const prev = idx > 0 ? matches[idx - 1] : null;
  const next = idx < matches.length - 1 ? matches[idx + 1] : null;

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
        prev={prev ? { date: prev.date, opponent: prev.opponent } : null}
        next={next ? { date: next.date, opponent: next.opponent } : null}
      />
    </div>
  );
}

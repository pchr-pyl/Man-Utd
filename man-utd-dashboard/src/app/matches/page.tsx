import { connection } from 'next/server';
import { getMatches, getMatchlogs, getSeasonRows, getMatchDetail } from '@/lib/data';
import { isCompleted } from '@/lib/matchReport';
import { seasonShort } from '@/lib/stats';
import { AppHeader } from '@/components/AppHeader';
import { MatchTabs } from '@/components/MatchTabs';
import { MatchlogBrowser } from '@/components/MatchlogBrowser';
import { FixtureCard, MatchReport } from '@/components/MatchReport';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] | undefined }>;
}) {
  await connection();
  const [params, matches, rows] = await Promise.all([
    searchParams,
    getMatches(),
    getSeasonRows(),
  ]);
  const view = Array.isArray(params.view) ? params.view[0] : params.view;

  let latestIdx = -1;
  matches.forEach((m, i) => {
    if (isCompleted(m)) latestIdx = i;
  });
  const match = latestIdx >= 0 ? matches[latestIdx] : undefined;
  const showScores = view === 'scores' || !match;

  const [matchlogs, detail] =
    !showScores && match
      ? await Promise.all([getMatchlogs(match.season), getMatchDetail(match.date)])
      : [null, null];
  const prev = latestIdx > 0 ? matches[latestIdx - 1] : null;
  const upcoming =
    latestIdx >= 0 ? matches.find((m, i) => i > latestIdx && !isCompleted(m)) : undefined;

  const allRows = rows.filter((r) => r.competition === 'All Competitions');
  const sorted = [...allRows].sort((a, b) => a.season.localeCompare(b.season));
  const first = sorted[0]?.season ?? '';
  const last = sorted[sorted.length - 1]?.season ?? '';
  const seasonRange = first && last ? `${seasonShort(first)} – ${seasonShort(last)}` : '';
  const seasons = [...new Set(matches.map((m) => m.season))].sort();

  return (
    <div className="hero-glow relative flex min-h-screen flex-col bg-bg">
      <AppHeader seasonRange={seasonRange} />
      {showScores || !match ? (
        <>
          <MatchTabs view="scores" />
          <MatchlogBrowser
            type="scores"
            matches={matches}
            seasons={seasons}
            titleKey="matchLog.tabs.scores"
          />
        </>
      ) : (
        <>
          <MatchTabs view="latest" narrow />
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
        </>
      )}
    </div>
  );
}

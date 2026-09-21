import { connection } from 'next/server';
import { getSeasonRows, getAttack, getAttackLeague, getMatches } from '@/lib/data';
import { seasonShort } from '@/lib/stats';
import { AppHeader } from '@/components/AppHeader';
import { AttackDashboard } from '@/components/AttackDashboard';
import { AttackTabs } from '@/components/AttackTabs';
import { AttackLogView } from '@/components/AttackLogView';

export default async function AttackPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; season?: string | string[] }>;
}) {
  await connection();
  const [params, rows, attack, attackLeague, matches] = await Promise.all([
    searchParams,
    getSeasonRows(),
    getAttack(),
    getAttackLeague(),
    getMatches(),
  ]);
  const viewParam = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = viewParam === 'shooting' ? 'shooting' : 'overview';
  const seasonParam = Array.isArray(params.season) ? params.season[0] : params.season;
  const seasons = [...new Set(matches.map((m) => m.season))].sort();
  const season = seasonParam && seasons.includes(seasonParam) ? seasonParam : undefined;

  const allRows = rows.filter((r) => r.competition === 'All Competitions');
  const sorted = [...allRows].sort((a, b) => a.season.localeCompare(b.season));
  const first = sorted[0]?.season ?? '';
  const last = sorted[sorted.length - 1]?.season ?? '';
  const seasonRange = first && last ? `${seasonShort(first)} – ${seasonShort(last)}` : '';

  return (
    <div className="hero-glow relative flex min-h-screen flex-col bg-bg">
      <AppHeader seasonRange={seasonRange} />
      <AttackTabs view={view} season={season} />
      {view === 'shooting' ? (
        <AttackLogView matches={matches} seasons={seasons} season={season} />
      ) : (
        <AttackDashboard rows={rows} attack={attack} attackLeague={attackLeague} />
      )}
    </div>
  );
}

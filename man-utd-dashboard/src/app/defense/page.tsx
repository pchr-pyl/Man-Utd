import { connection } from 'next/server';
import { getKeepers, getSeasonRows, getAttack, getAttackLeague } from '@/lib/data';
import { seasonShort } from '@/lib/stats';
import { AppHeader } from '@/components/AppHeader';
import { DefenseDashboard } from '@/components/DefenseDashboard';

export default async function DefensePage() {
  await connection();
  const [keepers, rows, attack, attackLeague] = await Promise.all([
    getKeepers(),
    getSeasonRows(),
    getAttack(),
    getAttackLeague(),
  ]);
  const allRows = rows.filter((r) => r.competition === 'All Competitions');
  const sorted = [...allRows].sort((a, b) => a.season.localeCompare(b.season));
  const first = sorted[0]?.season ?? '';
  const last = sorted[sorted.length - 1]?.season ?? '';
  const seasonRange = first && last ? `${seasonShort(first)} – ${seasonShort(last)}` : '';

  return (
    <div className="hero-glow relative flex min-h-screen flex-col bg-bg">
      <AppHeader seasonRange={seasonRange} />
      <DefenseDashboard rows={rows} attack={attack} attackLeague={attackLeague} keepers={keepers} />
    </div>
  );
}

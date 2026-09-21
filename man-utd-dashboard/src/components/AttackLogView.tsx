'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MatchRow } from '@/lib/types';
import { MatchlogBrowser } from './MatchlogBrowser';

export function AttackLogView({
  matches,
  seasons,
  season: urlSeason,
}: {
  matches: MatchRow[];
  seasons: string[];
  season?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [season, setSeason] = useState(urlSeason ?? seasons[seasons.length - 1] ?? '');
  const [prevUrlSeason, setPrevUrlSeason] = useState(urlSeason);

  if (urlSeason !== prevUrlSeason) {
    setPrevUrlSeason(urlSeason);
    if (urlSeason && seasons.includes(urlSeason)) setSeason(urlSeason);
  }

  const changeSeason = (s: string) => {
    if (!seasons.includes(s)) return;
    setSeason(s);
    router.replace(`${pathname}?view=shooting&season=${encodeURIComponent(s)}`, {
      scroll: false,
    });
  };

  return (
    <MatchlogBrowser
      type="shooting"
      matches={matches}
      seasons={seasons}
      titleKey="matchLog.tabs.shooting"
      season={season}
      onSeasonChange={changeSeason}
    />
  );
}

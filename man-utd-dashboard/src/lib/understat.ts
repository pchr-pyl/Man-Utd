export interface MatchShot {
  minute: number;
  result: string;
  xG: number;
  player: string;
  assistedBy: string | null;
  h_a: 'h' | 'a';
  X: number;
  Y: number;
  shotType: string;
  situation: string;
}

export interface RosterPlayer {
  id: string;
  playerId: string;
  name: string;
  position: string;
  order: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  xG: number;
  xA: number;
  subInFor: string | null;
  subOutTo: string | null;
}

export interface MatchDetail {
  understatId: string;
  homeTeam: string;
  awayTeam: string;
  shots: MatchShot[];
  home: RosterPlayer[];
  away: RosterPlayer[];
}

interface RawShot {
  minute: string;
  result: string;
  xG: string;
  player: string;
  player_assisted?: string | null;
  h_a: string;
  h_team?: string;
  a_team?: string;
  X: string;
  Y: string;
  shotType: string;
  situation: string;
}

interface RawRosterPlayer {
  id: string;
  player_id: string;
  player: string;
  position: string;
  positionOrder: string;
  time: string;
  goals: string;
  assists: string;
  yellow_card: string;
  red_card: string;
  xG: string;
  xA: string;
  roster_in: string;
  roster_out: string;
}

const toInt = (v: string | undefined | null) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : Math.round(n);
};

const toFloat = (v: string | undefined | null) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

function slimRoster(raw: Record<string, RawRosterPlayer> | undefined): RosterPlayer[] {
  if (!raw) return [];
  return Object.values(raw).map((p) => ({
    id: p.id,
    playerId: p.player_id,
    name: p.player,
    position: p.position,
    order: toInt(p.positionOrder),
    minutes: toInt(p.time),
    goals: toInt(p.goals),
    assists: toInt(p.assists),
    yellow: toInt(p.yellow_card),
    red: toInt(p.red_card),
    xG: toFloat(p.xG),
    xA: toFloat(p.xA),
    subInFor: p.roster_in !== '0' ? p.roster_in : null,
    subOutTo: p.roster_out !== '0' ? p.roster_out : null,
  }));
}

export function slimMatchDetail(id: string, raw: unknown): MatchDetail | null {
  const data = raw as {
    shots?: { h?: RawShot[]; a?: RawShot[] };
    rosters?: { h?: Record<string, RawRosterPlayer>; a?: Record<string, RawRosterPlayer> };
  } | null;
  if (!data?.shots) return null;

  const shots: MatchShot[] = [...(data.shots.h ?? []), ...(data.shots.a ?? [])].map((s) => ({
    minute: toInt(s.minute),
    result: s.result,
    xG: toFloat(s.xG),
    player: s.player,
    assistedBy: s.player_assisted ?? null,
    h_a: s.h_a === 'h' ? 'h' : 'a',
    X: toFloat(s.X),
    Y: toFloat(s.Y),
    shotType: s.shotType,
    situation: s.situation,
  }));

  return {
    understatId: id,
    homeTeam: data.shots.h?.[0]?.h_team ?? '',
    awayTeam: data.shots.a?.[0]?.a_team ?? '',
    shots,
    home: slimRoster(data.rosters?.h),
    away: slimRoster(data.rosters?.a),
  };
}

export async function fetchMatchDetail(id: string): Promise<MatchDetail | null> {
  try {
    const res = await fetch(`https://understat.com/main/getMatchData/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return slimMatchDetail(id, await res.json());
  } catch {
    return null;
  }
}

export interface GoalEvent {
  minute: number;
  player: string;
  assist: string | null;
  og: boolean;
  side: 'h' | 'a';
  score: string;
}

export function goalEvents(shots: MatchShot[]): GoalEvent[] {
  let h = 0;
  let a = 0;
  return shots
    .filter((s) => s.result === 'Goal' || s.result === 'OwnGoal')
    .sort((x, y) => x.minute - y.minute)
    .map((s) => {
      const og = s.result === 'OwnGoal';
      const side: 'h' | 'a' = og ? (s.h_a === 'h' ? 'a' : 'h') : s.h_a;
      if (side === 'h') h += 1;
      else a += 1;
      return {
        minute: s.minute,
        player: s.player,
        assist: s.assistedBy,
        og,
        side,
        score: `${h}–${a}`,
      };
    });
}

export function unitedSide(match: { venue: string | null }, detail: MatchDetail): 'h' | 'a' {
  if (match.venue === 'Home') return 'h';
  if (match.venue === 'Away') return 'a';
  return detail.homeTeam.includes('United') ? 'h' : 'a';
}

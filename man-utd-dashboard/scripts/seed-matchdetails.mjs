import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
const toInt = (v) => (Number.isNaN(Number(v)) ? 0 : Math.round(Number(v)));
const toFloat = (v) => (Number.isNaN(Number(v)) ? 0 : Number(v));

function slimRoster(raw) {
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

function slim(id, data) {
  if (!data?.shots) return null;
  const shots = [...(data.shots.h ?? []), ...(data.shots.a ?? [])].map((s) => ({
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

const index = {};
for (const name of await readdir(rawDir)) {
  if (!/^understat-\d+\.json$/.test(name)) continue;
  const data = JSON.parse(await readFile(join(rawDir, name), 'utf8'));
  for (const entry of data.dates ?? []) {
    if (entry.id && entry.datetime && entry.isResult) {
      index[entry.datetime.slice(0, 10)] = entry.id;
    }
  }
}

const dates = Object.keys(index).sort();
const since = process.argv[2]; // optional YYYY-MM-DD lower bound
const todo = since ? dates.filter((d) => d >= since) : dates;
console.log(`${todo.length} matches to fetch`);

let done = 0;
let failed = 0;
for (const date of todo) {
  const key = `matchdetail-${date}`;
  const existing = await sql`SELECT 1 FROM datasets WHERE key = ${key}`;
  if (existing.length > 0) {
    done += 1;
    continue;
  }
  try {
    const res = await fetch(`https://understat.com/main/getMatchData/${index[date]}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const detail = slim(index[date], await res.json());
    if (!detail) throw new Error('no shots');
    await sql`
      INSERT INTO datasets (key, payload, updated_at)
      VALUES (${key}, ${JSON.stringify(detail)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    `;
    done += 1;
  } catch (err) {
    failed += 1;
    console.error(`${date}: ${err.message}`);
  }
  if (done % 25 === 0) console.log(`${done}/${todo.length}`);
  await new Promise((r) => setTimeout(r, 200));
}

console.log(`done: ${done} seeded, ${failed} failed`);

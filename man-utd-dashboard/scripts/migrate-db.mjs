import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'db', 'migrations');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const applied = new Set((await sql`SELECT version FROM schema_migrations`).map((row) => row.version));
const migrations = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

for (const version of migrations) {
  if (applied.has(version)) continue;
  const migration = await readFile(join(migrationsDir, version), 'utf8');
  const statements = migration
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  await sql`INSERT INTO schema_migrations (version) VALUES (${version}) ON CONFLICT DO NOTHING`;
  console.log(`applied ${version}`);
}

console.log('database schema is up to date');

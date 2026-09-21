CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS season_stats (
  season text NOT NULL,
  competition text NOT NULL,
  position integer NOT NULL,
  rank text,
  mp integer,
  w integer,
  d integer,
  l integer,
  gf integer,
  ga integer,
  gd integer,
  pts integer,
  pts_per_mp double precision,
  xg double precision,
  xga double precision,
  xgd double precision,
  sota double precision,
  cs double precision,
  attendance double precision,
  top_scorer text,
  goalkeeper text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season, competition)
);

CREATE INDEX IF NOT EXISTS season_stats_position_idx ON season_stats (position);
CREATE INDEX IF NOT EXISTS season_stats_season_idx ON season_stats (season DESC);

CREATE TABLE IF NOT EXISTS matches (
  match_key text PRIMARY KEY,
  position integer NOT NULL,
  season text NOT NULL,
  match_date date NOT NULL,
  match_time text,
  competition text NOT NULL,
  round text,
  venue text,
  result text,
  gf integer,
  ga integer,
  gf_pens integer,
  ga_pens integer,
  opponent text,
  possession double precision,
  attendance double precision,
  captain text,
  formation text,
  opponent_formation text,
  referee text,
  notes text,
  xg double precision,
  xga double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matches_position_idx ON matches (position);
CREATE INDEX IF NOT EXISTS matches_season_date_idx ON matches (season, match_date DESC);
CREATE INDEX IF NOT EXISTS matches_competition_idx ON matches (competition, match_date DESC);

CREATE TABLE IF NOT EXISTS datasets (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE schema_migrations, season_stats, matches, datasets FROM PUBLIC;

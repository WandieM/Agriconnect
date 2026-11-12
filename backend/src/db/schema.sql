-- AgriOpportunity schema (PostgreSQL 13+). Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('youth', 'admin')),
  consent_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matching profile (one per youth user).
CREATE TABLE IF NOT EXISTS profiles (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  field      TEXT NOT NULL,
  province   TEXT NOT NULL,
  level      SMALLINT NOT NULL CHECK (level BETWEEN 0 AND 5),
  phone      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('bursary', 'internship', 'learnership', 'graduate_placement', 'programme', 'job')),
  organisation TEXT NOT NULL,
  description  TEXT NOT NULL,
  field        TEXT NOT NULL,          -- a field slug, or 'any'
  province     TEXT NOT NULL,          -- a province, or 'National'
  min_level    SMALLINT NOT NULL DEFAULT 0 CHECK (min_level BETWEEN 0 AND 5),
  stipend      TEXT,
  closing_date DATE NOT NULL,
  apply_method TEXT NOT NULL CHECK (apply_method IN ('link', 'form')),
  apply_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opps_status_closing ON opportunities(status, closing_date);

CREATE TABLE IF NOT EXISTS saved_opportunities (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- A closing-date alert: remind_on = closing_date - days_before.
CREATE TABLE IF NOT EXISTS alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  days_before    SMALLINT NOT NULL CHECK (days_before BETWEEN 0 AND 30),
  remind_on      DATE NOT NULL,
  dismissed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  motivation     TEXT NOT NULL,
  phone          TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'withdrawn')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

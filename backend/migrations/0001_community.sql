-- Brad.log: aggregate analytics and anonymous, moderated interactions.
-- Raw IPs, user agents, referrers, and emails are never application columns.
-- Times are Unix milliseconds. All date buckets use UTC.
CREATE TABLE IF NOT EXISTS site_counters (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0)
);
INSERT OR IGNORE INTO site_counters (id, visits) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS page_counters (
  page_id TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0)
);

CREATE TABLE IF NOT EXISTS page_daily (
  page_id TEXT NOT NULL,
  day TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  PRIMARY KEY (page_id, day)
);

-- This table is a short-lived idempotency ledger, not a visitor history.
CREATE TABLE IF NOT EXISTS view_events (
  event_key TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS view_events_expiry ON view_events (created_at);
CREATE TRIGGER IF NOT EXISTS record_view AFTER INSERT ON view_events
BEGIN
  INSERT INTO page_counters (page_id, visits, likes)
    VALUES (NEW.page_id, 1, 0)
    ON CONFLICT (page_id) DO UPDATE SET visits = visits + 1;
  UPDATE site_counters SET visits = visits + 1 WHERE id = 1;
  INSERT INTO page_daily (page_id, day, visits)
    VALUES (NEW.page_id, NEW.day, 1)
    ON CONFLICT (page_id, day) DO UPDATE SET visits = visits + 1;
END;

-- Session keys are HMACs rotated daily. No per-client state is returned publicly.
CREATE TABLE IF NOT EXISTS presence (
  page_id TEXT NOT NULL,
  session_key TEXT NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (page_id, session_key)
);
CREATE INDEX IF NOT EXISTS presence_recent ON presence (last_seen, session_key);
CREATE INDEX IF NOT EXISTS presence_page_recent ON presence (page_id, last_seen);

-- The HMAC includes the article ID, preventing correlation across articles.
CREATE TABLE IF NOT EXISTS reactions (
  article_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (article_id, visitor_key)
);
CREATE TRIGGER IF NOT EXISTS add_like AFTER INSERT ON reactions
BEGIN
  INSERT INTO page_counters (page_id, visits, likes)
    VALUES (NEW.article_id, 0, 1)
    ON CONFLICT (page_id) DO UPDATE SET likes = likes + 1;
END;
CREATE TRIGGER IF NOT EXISTS remove_like AFTER DELETE ON reactions
BEGIN
  UPDATE page_counters SET likes = MAX(0, likes - 1)
    WHERE page_id = OLD.article_id;
END;

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  mutation_key TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 32),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 2 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_public
  ON comments (article_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS comments_expiry ON comments (status, created_at);

-- Keyed by a daily rotating HMAC of the network address; never the raw address.
CREATE TABLE IF NOT EXISTS rate_buckets (
  scope TEXT NOT NULL,
  client_key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1 CHECK (hits > 0),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, client_key, bucket)
);
CREATE INDEX IF NOT EXISTS rate_buckets_expiry ON rate_buckets (expires_at);

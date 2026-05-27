-- Chronicle local-first SQLite schema draft
-- Status: initial data foundation
-- Updated: 2026-04-27

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  license_category TEXT NOT NULL,
  attribution TEXT NOT NULL DEFAULT '',
  storage_rights TEXT NOT NULL,
  modification_rights TEXT NOT NULL,
  commercial_use TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bible_translations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  source_id TEXT NOT NULL REFERENCES sources(id),
  license_status TEXT NOT NULL,
  attribution TEXT NOT NULL,
  storage_policy TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  osis_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  canonical_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id),
  chapter_number INTEGER NOT NULL,
  heading TEXT,
  UNIQUE (book_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,
  translation_id TEXT NOT NULL REFERENCES bible_translations(id),
  book_id TEXT NOT NULL REFERENCES books(id),
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  paragraph_id TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  UNIQUE (translation_id, book_id, chapter_number, verse_number)
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 1,
  source_id TEXT REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  source_id TEXT REFERENCES sources(id),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS theme_tags (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  target_node_id TEXT NOT NULL REFERENCES nodes(id),
  target_type TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  confidence TEXT NOT NULL CHECK (confidence IN ('direct', 'strong', 'inferred', 'debated', 'user_added', 'ai_suggested')),
  reason TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected', 'hidden')),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES nodes(id),
  target_node_id TEXT NOT NULL REFERENCES nodes(id),
  relationship_type TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('direct', 'strong', 'inferred', 'debated', 'user_added', 'ai_suggested')),
  reason TEXT NOT NULL DEFAULT '',
  source_id TEXT NOT NULL REFERENCES sources(id),
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected', 'hidden')),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS original_tokens (
  id TEXT PRIMARY KEY,
  verse_node_id TEXT NOT NULL REFERENCES nodes(id),
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  position_index INTEGER NOT NULL,
  surface TEXT NOT NULL,
  lemma TEXT,
  strongs TEXT,
  morphology TEXT,
  gloss TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS commentary_notes (
  id TEXT PRIMARY KEY,
  target_node_id TEXT NOT NULL REFERENCES nodes(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  license_category TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logos_links (
  id TEXT PRIMARY KEY,
  target_node_id TEXT NOT NULL REFERENCES nodes(id),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_title TEXT,
  user_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('user', 'system', 'ai'))
);

CREATE TABLE IF NOT EXISTS chronicle_entries (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES authors(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('prayer', 'reflection', 'insight', 'study_note', 'theme_trail', 'ai_exchange', 'return_after_absence', 'export')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  superseded_by TEXT REFERENCES chronicle_entries(id),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS chronicle_entry_links (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES chronicle_entries(id),
  node_id TEXT NOT NULL REFERENCES nodes(id),
  relationship_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_responses (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  source_basis_json TEXT NOT NULL,
  confidence TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verses_reference ON verses (book_id, chapter_number, verse_number);
CREATE INDEX IF NOT EXISTS idx_theme_tags_theme ON theme_tags (theme_id, status);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges (source_node_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges (target_node_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_chronicle_entries_created ON chronicle_entries (created_at);


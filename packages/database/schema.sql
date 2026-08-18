PRAGMA foreign_keys = ON;
CREATE TABLE mandates (id TEXT PRIMARY KEY, owner TEXT NOT NULL, source_text TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE assets (id TEXT PRIMARY KEY, symbol TEXT UNIQUE NOT NULL, class TEXT NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE portfolios (id TEXT PRIMARY KEY, mandate_id TEXT NOT NULL REFERENCES mandates(id), phase TEXT NOT NULL, risk INTEGER NOT NULL, expected_return REAL NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE audit_events (id TEXT PRIMARY KEY, mandate_id TEXT NOT NULL REFERENCES mandates(id), actor TEXT NOT NULL, event_type TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX audit_mandate_time ON audit_events(mandate_id, created_at);

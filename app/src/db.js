// src/db.js
// Single-file SQLite store for events + refresh logs.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || '/data/outings.db';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    city          TEXT NOT NULL,
    category      TEXT NOT NULL,
    start_date    TEXT NOT NULL,   -- ISO yyyy-mm-dd
    start_time    TEXT,            -- optional HH:mm
    end_date      TEXT,
    venue         TEXT,
    address       TEXT,
    description   TEXT,
    url           TEXT,
    price         TEXT,
    source        TEXT,
    fetched_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
  CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
  CREATE INDEX IF NOT EXISTS idx_events_cat  ON events(category);

  CREATE TABLE IF NOT EXISTS refresh_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    status      TEXT,
    detail      TEXT
  );
`);

const stmts = {
  upsert: db.prepare(`
    INSERT INTO events
      (id, title, city, category, start_date, start_time, end_date,
       venue, address, description, url, price, source, fetched_at)
    VALUES
      (@id, @title, @city, @category, @start_date, @start_time, @end_date,
       @venue, @address, @description, @url, @price, @source, @fetched_at)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, city=excluded.city, category=excluded.category,
      start_date=excluded.start_date, start_time=excluded.start_time,
      end_date=excluded.end_date, venue=excluded.venue, address=excluded.address,
      description=excluded.description, url=excluded.url, price=excluded.price,
      source=excluded.source, fetched_at=excluded.fetched_at
  `),
  rangeQuery: db.prepare(`
    SELECT * FROM events
     WHERE start_date >= @from AND start_date <= @to
     ORDER BY start_date ASC, start_time ASC
  `),
  distinctCities: db.prepare(`SELECT DISTINCT city FROM events ORDER BY city`),
  distinctCats:   db.prepare(`SELECT DISTINCT category FROM events ORDER BY category`),
  pruneOld: db.prepare(`DELETE FROM events WHERE start_date < date('now', '-7 day')`),
  logStart: db.prepare(`INSERT INTO refresh_log (started_at, status) VALUES (?, 'running')`),
  logEnd: db.prepare(`UPDATE refresh_log SET ended_at=?, status=?, detail=? WHERE id=?`),
  lastRefresh: db.prepare(`SELECT * FROM refresh_log ORDER BY id DESC LIMIT 1`),
};

function upsertEvents(events) {
  const txn = db.transaction((rows) => {
    for (const r of rows) stmts.upsert.run(r);
  });
  txn(events);
}

function getEvents({ from, to }) {
  return stmts.rangeQuery.all({ from, to });
}

function distinctCities() { return stmts.distinctCities.all().map(r => r.city); }
function distinctCategories() { return stmts.distinctCats.all().map(r => r.category); }

function pruneOld() { return stmts.pruneOld.run().changes; }

function beginRefresh() {
  const now = new Date().toISOString();
  const res = stmts.logStart.run(now);
  return res.lastInsertRowid;
}
function endRefresh(id, status, detail) {
  stmts.logEnd.run(new Date().toISOString(), status, detail || '', id);
}
function lastRefresh() { return stmts.lastRefresh.get(); }

module.exports = {
  upsertEvents, getEvents, distinctCities, distinctCategories,
  pruneOld, beginRefresh, endRefresh, lastRefresh, DB_PATH
};

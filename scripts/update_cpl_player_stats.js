#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseVerifiedMatchIndex } = require("../api/lib/confirmed-playing-xi");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SITE = "https://www.cplseason.com";
const SERIES_ID = 12123;
const MATCH_COUNT = 39;
const SCORECARD_INDEX = `https://www.cricbuzz.com/cricket-series/${SERIES_ID}/caribbean-premier-league-2026/matches`;
const VALIDATION_URL = `https://www.cricbuzz.com/cricket-series/${SERIES_ID}/caribbean-premier-league-2026/stats`;

const NAME_ALIASES = new Map(Object.entries({
  "abdul raheem": "abdul-raheem-toppin",
  "amari alexandre goodridge": "amari-goodridge",
  "ashmead romano nedd": "ashmead-nedd",
  "jyd uri goolie": "jyd-goolie",
  "mavendra dindya": "mavendra-dindyal",
  "mavendra dindyal": "mavendra-dindyal",
  "mc kenny clarke": "mckenny-clarke",
  "morawakage maheesh theekshana": "maheesh-theekshana",
  "ramon romario simmonds": "ramon-simmonds",
  "tajinder dhillon": "tajinder-singh",
}));

function normalizedName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function oversToBalls(value) {
  const text = String(value ?? "0").trim();
  if (!text) return 0;
  const [wholeText, ballText = "0"] = text.split(".");
  const whole = Number(wholeText);
  const balls = Number(ballText);
  if (!Number.isInteger(whole) || !Number.isInteger(balls) || balls < 0 || balls > 5) {
    throw new Error(`Invalid cricket overs value: ${value}`);
  }
  return whole * 6 + balls;
}

function ballsToOvers(value) {
  const balls = Number(value) || 0;
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function emptyPlayerStats(name, slug) {
  return {
    slug,
    name,
    matches: 0,
    batting: {
      innings: 0, notOuts: 0, runs: 0, balls: 0, highScore: "—",
      average: "—", strikeRate: "0.00", fours: 0, sixes: 0,
      fifties: 0, hundreds: 0,
    },
    bowling: {
      innings: 0, balls: 0, overs: "0.0", maidens: 0, runs: 0,
      wickets: 0, average: "—", economy: "—", best: "—",
    },
    _matchNumbers: new Set(),
    _battingHighScore: -1,
    _battingHighScoreNotOut: false,
    _bestWickets: -1,
    _bestRuns: Number.POSITIVE_INFINITY,
  };
}

function hasBatted(row) {
  return Number(row?.balls || 0) > 0 || Number(row?.runs || 0) > 0 || Boolean(String(row?.dismissal || "").trim());
}

function isNotOut(row) {
  if (row?.notOut === true) return true;
  const dismissal = String(row?.dismissal || "").toLowerCase();
  return /not out|retired hurt|absent hurt/.test(dismissal);
}

function recordAppearance(stats, matchNumber) {
  stats._matchNumbers.add(Number(matchNumber));
}

function addBatting(stats, row) {
  if (!hasBatted(row)) return;
  const runs = Number(row.runs || 0);
  const notOut = isNotOut(row);
  stats.batting.innings += 1;
  stats.batting.runs += runs;
  stats.batting.balls += Number(row.balls || 0);
  stats.batting.fours += Number(row.fours || 0);
  stats.batting.sixes += Number(row.sixes || 0);
  if (notOut) stats.batting.notOuts += 1;
  if (runs >= 100) stats.batting.hundreds += 1;
  else if (runs >= 50) stats.batting.fifties += 1;
  if (runs > stats._battingHighScore || (runs === stats._battingHighScore && notOut)) {
    stats._battingHighScore = runs;
    stats._battingHighScoreNotOut = notOut;
  }
}

function addBowling(stats, row) {
  const balls = Number.isFinite(Number(row?.balls))
    ? Number(row.balls)
    : oversToBalls(row?.overs);
  if (balls <= 0) return;
  const runs = Number(row.runs || 0);
  const wickets = Number(row.wickets || 0);
  stats.bowling.innings += 1;
  stats.bowling.balls += balls;
  stats.bowling.maidens += Number(row.maidens || 0);
  stats.bowling.runs += runs;
  stats.bowling.wickets += wickets;
  if (wickets > stats._bestWickets || (wickets === stats._bestWickets && runs < stats._bestRuns)) {
    stats._bestWickets = wickets;
    stats._bestRuns = runs;
  }
}

function finalizeStats(stats) {
  stats.matches = stats._matchNumbers.size;
  const dismissals = stats.batting.innings - stats.batting.notOuts;
  stats.batting.highScore = stats._battingHighScore < 0
    ? "—"
    : `${stats._battingHighScore}${stats._battingHighScoreNotOut ? "*" : ""}`;
  stats.batting.average = dismissals > 0
    ? (stats.batting.runs / dismissals).toFixed(2)
    : (stats.batting.innings > 0 ? "—" : "—");
  stats.batting.strikeRate = stats.batting.balls > 0
    ? (stats.batting.runs * 100 / stats.batting.balls).toFixed(2)
    : "0.00";
  stats.bowling.overs = ballsToOvers(stats.bowling.balls);
  stats.bowling.average = stats.bowling.wickets > 0
    ? (stats.bowling.runs / stats.bowling.wickets).toFixed(2)
    : "—";
  stats.bowling.economy = stats.bowling.balls > 0
    ? (stats.bowling.runs * 6 / stats.bowling.balls).toFixed(2)
    : "—";
  stats.bowling.best = stats._bestWickets < 0 ? "—" : `${stats._bestWickets}/${stats._bestRuns}`;
  delete stats._matchNumbers;
  delete stats._battingHighScore;
  delete stats._battingHighScoreNotOut;
  delete stats._bestWickets;
  delete stats._bestRuns;
  return stats;
}

function parseEmbeddedArray(html, key) {
  const source = String(html || "").replace(/\\\"/g, '"').replace(/\\\\/g, "\\");
  const keyIndex = source.indexOf(`"${key}":`);
  const start = source.indexOf("[", keyIndex);
  if (keyIndex < 0 || start < 0) throw new Error(`Embedded ${key} array not found`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  throw new Error(`Embedded ${key} array is incomplete`);
}

function cricbuzzScorecard(html) {
  return parseEmbeddedArray(html, "scoreCard").map((innings, index) => ({
    inningsNumber: Number(innings.inningsId || index + 1),
    battingTeamName: innings.batTeamDetails?.batTeamName || "",
    batting: Object.values(innings.batTeamDetails?.batsmenData || {}).map((row) => ({
      name: row.batName,
      dismissal: row.outDesc || "",
      runs: Number(row.runs || 0),
      balls: Number(row.balls || 0),
      fours: Number(row.fours || 0),
      sixes: Number(row.sixes || 0),
      notOut: /not out|retired hurt|absent hurt/i.test(String(row.outDesc || "")),
    })),
    bowling: Object.values(innings.bowlTeamDetails?.bowlersData || {}).map((row) => ({
      name: row.bowlName,
      overs: row.overs,
      balls: Number(row.balls || oversToBalls(row.overs)),
      maidens: Number(row.maidens || 0),
      runs: Number(row.runs || 0),
      wickets: Number(row.wickets || 0),
    })),
  }));
}

function buildPlayerIndex(playerDirectory) {
  const players = fs.readdirSync(playerDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(playerDirectory, name), "utf8")));
  const byName = new Map();
  const stats = new Map();
  for (const player of players) {
    for (const value of [player.name, player.profile?.full_name]) {
      const key = normalizedName(value);
      if (key) byName.set(key, player.slug);
    }
    stats.set(player.slug, emptyPlayerStats(player.name, player.slug));
  }
  return { players, byName, stats };
}

function resolveSlug(name, playerIndex) {
  const key = normalizedName(name);
  return NAME_ALIASES.get(key) || playerIndex.byName.get(key) || null;
}

function aggregateMatches(matches, playerIndex) {
  const unmatched = new Set();
  const usePlayer = (name, callback) => {
    const slug = resolveSlug(name, playerIndex);
    if (!slug || !playerIndex.stats.has(slug)) {
      if (name) unmatched.add(String(name));
      return;
    }
    callback(playerIndex.stats.get(slug));
  };
  for (const item of matches) {
    const matchNumber = Number(item.matchNumber);
    const noResultWithoutPlay = !(item.scorecard || []).length
      && /no result/i.test(String(item.description || item.stateOfPlay || ""));
    if (noResultWithoutPlay) continue;
    for (const lineup of item.confirmedPlayingXi || []) {
      for (const player of lineup.players || []) {
        usePlayer(player.name, (stats) => recordAppearance(stats, matchNumber));
      }
    }
    for (const innings of item.scorecard || []) {
      for (const row of innings.batting || []) {
        usePlayer(row.name, (stats) => {
          recordAppearance(stats, matchNumber);
          addBatting(stats, row);
        });
      }
      for (const row of innings.bowling || []) {
        usePlayer(row.name, (stats) => {
          recordAppearance(stats, matchNumber);
          addBowling(stats, row);
        });
      }
    }
  }
  return {
    players: Object.fromEntries([...playerIndex.stats.entries()].map(([slug, stats]) => [slug, finalizeStats(stats)])),
    unmatchedSourcePlayers: [...unmatched].sort((a, b) => a.localeCompare(b)),
  };
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 CPLSeasonStats/1.0" } });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

async function mapLimit(values, limit, callback) {
  const output = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      output[index] = await callback(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function collectCompletedMatches(siteUrl = DEFAULT_SITE) {
  const payloads = await mapLimit(
    Array.from({ length: MATCH_COUNT }, (_, index) => index + 1),
    5,
    (matchNumber) => fetchJson(`${siteUrl}/api/cpl-live-score?match=${matchNumber}`),
  );
  const completed = payloads
    .filter((payload) => /^official-cpl-mcpro$/.test(String(payload.source || "")))
    .map((payload) => payload.match || payload.focus)
    .filter((match) => /^completed$/i.test(String(match?.status || "")))
    .sort((left, right) => Number(left.matchNumber) - Number(right.matchNumber));
  if (!completed.length) throw new Error("No completed official CPL matches were returned");
  const unique = new Set(completed.map((match) => Number(match.matchNumber)));
  if (unique.size !== completed.length) throw new Error("Duplicate completed match numbers returned");

  const missingScorecards = completed.filter((match) => !(match.scorecard || []).length && !/no result/i.test(String(match.description || match.stateOfPlay || "")));
  const fallbackMatches = [];
  if (missingScorecards.length) {
    const matchIndex = parseVerifiedMatchIndex(await fetchText(SCORECARD_INDEX), SERIES_ID);
    for (const match of missingScorecards) {
      const matchNumber = Number(match.matchNumber);
      const scoreUrl = String(matchIndex.get(matchNumber) || "").replace("/live-cricket-scores/", "/live-cricket-scorecard/");
      if (!scoreUrl) throw new Error(`No verified Cricbuzz scorecard URL for Match ${matchNumber}`);
      match.scorecard = cricbuzzScorecard(await fetchText(scoreUrl));
      fallbackMatches.push(matchNumber);
    }
  }
  return { completed, fallbackMatches };
}

async function main() {
  const siteUrl = process.env.CPL_SITE_URL || DEFAULT_SITE;
  const playerIndex = buildPlayerIndex(path.join(ROOT, "data", "players"));
  const { completed, fallbackMatches } = await collectCompletedMatches(siteUrl);
  const aggregate = aggregateMatches(completed, playerIndex);
  const throughMatch = Math.max(...completed.map((match) => Number(match.matchNumber)));
  const noResultMatches = completed
    .filter((match) => /no result/i.test(String(match.description || match.stateOfPlay || "")))
    .map((match) => Number(match.matchNumber));
  const output = {
    competition: "Caribbean Premier League 2026",
    throughMatch,
    completedMatches: completed.length,
    scorecardMatches: completed.filter((match) => (match.scorecard || []).length).length,
    updatedAt: new Date().toISOString().slice(0, 10),
    source: {
      primary: "Official CPL MCPro match feed",
      primaryUrl: `${siteUrl}/api/cpl-live-score`,
      secondary: "Cricbuzz scorecards for documented official-feed gaps",
      secondaryUrl: SCORECARD_INDEX,
      validationUrl: VALIDATION_URL,
    },
    fallbackMatches,
    noResultMatches,
    unmatchedSourcePlayers: aggregate.unmatchedSourcePlayers,
    players: aggregate.players,
  };
  const outputPath = path.join(ROOT, "data", "cpl-2026-player-stats.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    output: path.relative(ROOT, outputPath),
    throughMatch,
    completedMatches: completed.length,
    scorecardMatches: output.scorecardMatches,
    fallbackMatches,
    noResultMatches,
    siteProfiles: playerIndex.players.length,
    unmatchedSourcePlayers: aggregate.unmatchedSourcePlayers,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  NAME_ALIASES,
  addBatting,
  addBowling,
  aggregateMatches,
  ballsToOvers,
  buildPlayerIndex,
  cricbuzzScorecard,
  emptyPlayerStats,
  finalizeStats,
  hasBatted,
  normalizedName,
  oversToBalls,
  resolveSlug,
};

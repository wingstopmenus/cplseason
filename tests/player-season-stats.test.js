"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  addBatting,
  addBowling,
  aggregateMatches,
  ballsToOvers,
  buildPlayerIndex,
  emptyPlayerStats,
  finalizeStats,
  oversToBalls,
  resolveSlug,
} = require("../scripts/update_cpl_player_stats");

const ROOT = path.resolve(__dirname, "..");

test("cricket overs convert to legal ball counts", () => {
  assert.equal(oversToBalls("4"), 24);
  assert.equal(oversToBalls("3.4"), 22);
  assert.equal(ballsToOvers(22), "3.4");
  assert.throws(() => oversToBalls("2.6"), /Invalid cricket overs/);
});

test("batting totals handle DNB, not-outs, average and strike rate", () => {
  const stats = emptyPlayerStats("Test Batter", "test-batter");
  addBatting(stats, { runs: 0, balls: 0, dismissal: "" });
  addBatting(stats, { runs: 60, balls: 30, fours: 5, sixes: 4, dismissal: "not out", notOut: true });
  addBatting(stats, { runs: 40, balls: 25, fours: 3, sixes: 1, dismissal: "b Bowler" });
  const final = finalizeStats(stats);
  assert.deepEqual(
    { innings: final.batting.innings, runs: final.batting.runs, highScore: final.batting.highScore, average: final.batting.average, strikeRate: final.batting.strikeRate },
    { innings: 2, runs: 100, highScore: "60*", average: "100.00", strikeRate: "181.82" },
  );
});

test("bowling totals use balls, not decimal arithmetic", () => {
  const stats = emptyPlayerStats("Test Bowler", "test-bowler");
  addBowling(stats, { overs: 3.4, runs: 20, wickets: 2, maidens: 1 });
  addBowling(stats, { balls: 24, overs: 4, runs: 30, wickets: 3, maidens: 0 });
  const final = finalizeStats(stats);
  assert.equal(final.bowling.overs, "7.4");
  assert.equal(final.bowling.wickets, 5);
  assert.equal(final.bowling.average, "10.00");
  assert.equal(final.bowling.best, "3/30");
});

test("validated aliases resolve but unrelated replacement names do not merge", () => {
  const index = buildPlayerIndex(path.join(ROOT, "data", "players"));
  assert.equal(resolveSlug("Morawakage Maheesh Theekshana", index), "maheesh-theekshana");
  assert.equal(resolveSlug("Tajinder Dhillon", index), "tajinder-singh");
  assert.equal(resolveSlug("Andries Gous", index), null);
});

test("no-result lineups are not counted as statistical appearances", () => {
  const index = buildPlayerIndex(path.join(ROOT, "data", "players"));
  const output = aggregateMatches([{
    matchNumber: 21,
    description: "No result",
    scorecard: [],
    confirmedPlayingXi: [{ players: [{ name: "Alzarri Joseph" }] }],
  }], index);
  assert.equal(output.players["alzarri-joseph"].matches, 0);
});

test("generated season dataset covers every player profile and validated leaders", () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "cpl-2026-player-stats.json"), "utf8"));
  const profileCount = fs.readdirSync(path.join(ROOT, "data", "players")).filter((name) => name.endsWith(".json")).length;
  assert.equal(Object.keys(data.players).length, profileCount);
  assert.deepEqual(
    [data.players["colin-munro"].matches, data.players["colin-munro"].batting.runs, data.players["colin-munro"].batting.average, data.players["colin-munro"].batting.strikeRate],
    [7, 238, "34.00", "120.81"],
  );
  assert.deepEqual(
    [data.players["matthew-forde"].matches, data.players["matthew-forde"].bowling.overs, data.players["matthew-forde"].bowling.wickets, data.players["matthew-forde"].bowling.average],
    [7, "24.4", 13, "18.08"],
  );
});

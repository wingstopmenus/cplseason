"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  mergeOfficialMatchDetail,
  normalizeCricketOvers,
} = require("../api/lib/match-summary");

const listInnings = [
  { inningsId: "innings_1", progressiveScores: { runs: 183, wickets: 4 } },
  { inningsId: "innings_2", progressiveScores: { runs: 175, wickets: 7 } },
];

test("match detail keeps verified list innings when post-match detail omits them", () => {
  const merged = mergeOfficialMatchDetail(
    {
      matchId: "match-24",
      competition: { matchNumber: 24, name: "CPL 2026" },
      inningsScores: listInnings,
    },
    {
      matchId: "match-24",
      status: "Completed",
      competition: { name: "Caribbean Premier League" },
      inningsScores: [],
    },
  );

  assert.equal(merged.competition.matchNumber, 24);
  assert.equal(merged.competition.name, "Caribbean Premier League");
  assert.deepEqual(merged.inningsScores, listInnings);
});

test("match detail innings remain authoritative when they are available", () => {
  const detailInnings = [
    { inningsId: "innings_1", progressiveScores: { runs: 184, wickets: 4 } },
  ];
  const merged = mergeOfficialMatchDetail(
    { inningsScores: listInnings },
    { inningsScores: detailInnings },
  );

  assert.deepEqual(merged.inningsScores, detailInnings);
});

test("invalid six-ball decimal notation rolls into the next over", () => {
  assert.equal(normalizeCricketOvers("19.6"), 20);
  assert.equal(normalizeCricketOvers(14.6), 15);
  assert.equal(normalizeCricketOvers("12.5"), 12.5);
  assert.equal(normalizeCricketOvers(""), null);
});

test("completed matches show verified totals when the full scorecard feed is empty", () => {
  const client = fs.readFileSync(
    path.resolve(__dirname, "../static/js/site.js"),
    "utf8",
  );
  assert.match(client, /const inningsSummaries = Array\.isArray\(match\?\.innings\)/);
  assert.match(client, /title\.textContent = verifiedTotals\.length/);
  assert.match(client, /Full batting and bowling figures are temporarily unavailable from the official feed/);
});

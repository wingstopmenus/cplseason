"use strict";

const assert = require("node:assert/strict");
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

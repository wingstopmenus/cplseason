"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildTeamResults,
  formatOvers,
  normalizeTeamName,
} = require("../static/js/team-results");

const ROOT = path.resolve(__dirname, "..");

test("team aliases normalize official punctuation and Saint/St variants", () => {
  assert.equal(normalizeTeamName("St. Kitts and Nevis Patriots"), normalizeTeamName("St Kitts & Nevis Patriots"));
  assert.equal(normalizeTeamName("Saint Lucia Kings"), normalizeTeamName("St Lucia Kings"));
});

test("team results use completed official matches, scores and newest-first order", () => {
  const matches = [
    {
      matchNumber: 2,
      status: "Completed",
      description: "Trinbago Knight Riders won by 4 wkts",
      teams: [
        { id: "a", name: "St. Kitts and Nevis Patriots", shortName: "SNP" },
        { id: "b", name: "Trinbago Knight Riders", shortName: "TKR" },
      ],
      innings: [
        { battingTeamId: "a", inningsNumber: 1, runs: 155, wickets: 8, overs: 20 },
        { battingTeamId: "b", inningsNumber: 2, runs: 156, wickets: 6, overs: 19.2 },
      ],
    },
    { matchNumber: 24, status: "Scheduled", teams: [{ name: "Trinbago Knight Riders" }] },
    { matchNumber: 21, status: "No result", description: "No result", teams: [{ name: "St Kitts & Nevis Patriots" }], innings: [] },
  ];
  const schedule = [
    { matchNumber: 2, label: "Sat 8 Aug", home: "St Kitts & Nevis Patriots", away: "Trinbago Knight Riders", url: "/match/two/" },
    { matchNumber: 21, label: "Sun 30 Aug", home: "St Kitts & Nevis Patriots", away: "Antigua & Barbuda Falcons", url: "/match/twenty-one/" },
  ];
  const results = buildTeamResults(matches, schedule, ["St Kitts & Nevis Patriots"], new Set([2, 21]));
  assert.equal(results.length, 2);
  assert.equal(results[0].matchNumber, 21);
  assert.equal(results[1].score, "SNP: 155/8 (20.0) · TKR: 156/6 (19.2)");
  assert.equal(results[1].result, "Trinbago Knight Riders won by 4 wickets");
  assert.equal(results[1].url, "/match/two/");
});

test("score overs correct invalid 19.6 feed notation to 20.0", () => {
  assert.equal(formatOvers(19.6), "20.0");
});

test("team template has dynamic result hooks and no campaign-specific empty copy", () => {
  const template = fs.readFileSync(path.join(ROOT, "templates", "team.html"), "utf8");
  assert.match(template, /data-team-results/);
  assert.match(template, /team-results\.js/);
  assert.doesNotMatch(template, /No CPL 2026 result yet/);
  assert.doesNotMatch(template, /begin their campaign/);
});

test("generated team fixture hooks use the actual ten match record numbers", () => {
  const html = fs.readFileSync(path.join(ROOT, "team", "trinbago-knight-riders", "index.html"), "utf8");
  const numbers = [...html.matchAll(/data-team-fixture data-match-number="(\d+)"/g)]
    .map((match) => Number(match[1]))
    .sort((left, right) => left - right);
  assert.deepEqual(numbers, [2, 8, 14, 17, 19, 20, 22, 24, 27, 33]);
});

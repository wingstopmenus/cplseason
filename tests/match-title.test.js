const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { build, ordinal } = require("../static/js/match-title.js");

const teams = [
  { id: "snp", name: "St. Kitts and Nevis Patriots", shortName: "SKN" },
  { id: "bbt", name: "Barbados Tridents", shortName: "BTR" },
];

const context = {
  matchNumber: 23,
  homeName: "St Kitts and Nevis Patriots",
  awayName: teams[1].name,
  startIso: "2026-09-01T19:00:00-04:00",
  stage: "League stage",
};

test("ordinal match labels work for every match number without a match list", () => {
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(11), "11th");
  assert.equal(ordinal(23), "23rd");
  assert.equal(ordinal(39), "39th");
});

test("scheduled match title uses Today only on the displayed fixture date", () => {
  const title = build({ matchNumber: 23, status: "Scheduled", startDate: context.startIso, teams }, {
    ...context,
    now: new Date(2026, 8, 1, 14, 0, 0),
  });
  assert.equal(
    title,
    "St Kitts and Nevis Patriots vs Barbados Tridents, 23rd Match, Caribbean Premier League 2026, Today, Caribbean Premier League 2026",
  );
});

test("live match title leads with current score, opposition score and active batters", () => {
  const title = build({
    matchNumber: 23,
    status: "Live",
    startDate: context.startIso,
    teams,
    innings: [
      { battingTeamId: "bbt", runs: 217, wickets: 4, overs: 20 },
      { battingTeamId: "snp", runs: 35, wickets: 0, overs: 3.5 },
    ],
    live: {
      batters: [
        { name: "Johnson Charles", runs: 26, balls: 15 },
        { name: "Kyle Mayers", runs: 9, balls: 8 },
      ],
    },
  }, context);
  assert.equal(
    title,
    "SNP 35/0 (3.5) vs BBT 217/4 (Johnson Charles 26(15) Kyle Mayers 9(8)) | St Kitts and Nevis Patriots vs Barbados Tridents, 23rd Match, Caribbean Premier League 2026, Tuesday, September 1, Caribbean Premier League 2026",
  );
});

test("completed match title includes final scores and the verified result", () => {
  const title = build({
    matchNumber: 23,
    status: "Completed",
    description: "Barbados Tridents won by 12 runs",
    startDate: context.startIso,
    teams,
    innings: [
      { battingTeamId: "bbt", runs: 217, wickets: 4, overs: 20 },
      { battingTeamId: "snp", runs: 205, wickets: 8, overs: 15.6 },
    ],
  }, context);
  assert.equal(
    title,
    "SNP 205/8 (16) vs BBT 217/4 (Barbados Tridents won by 12 runs) | St Kitts and Nevis Patriots vs Barbados Tridents, 23rd Match, Caribbean Premier League 2026, Tuesday, September 1, Caribbean Premier League 2026",
  );
});

test("match pages expose the dynamic title through crawl and social metadata", () => {
  const root = path.resolve(__dirname, "..");
  const page = fs.readFileSync(
    path.join(root, "match/trinbago-knight-riders-vs-antigua-barbuda-falcons/index.html"),
    "utf8",
  );
  const client = fs.readFileSync(path.join(root, "static/js/site.js"), "utf8");
  assert.match(page, /<title>Trinbago Knight Riders vs Antigua &amp; Barbuda Falcons, 24th Match,/);
  assert.match(page, /<meta name="twitter:title" content="Trinbago Knight Riders vs Antigua &amp; Barbuda Falcons, 24th Match,/);
  assert.match(page, /type="application\/ld\+json" data-match-schema/);
  assert.match(client, /meta\[name="twitter:title"\]/);
  assert.match(client, /webPage\.name = dynamicTitle/);
});

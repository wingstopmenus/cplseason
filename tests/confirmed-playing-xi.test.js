"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  loadConfirmedPlayingXi,
  parseConfirmedPlayingXi,
  parseVerifiedMatchIndex,
} = require("../api/lib/confirmed-playing-xi");

function players(prefix, count = 11, substitutes = 0) {
  return [
    ...Array.from({ length: count }, (_, index) => ({
      name: `${prefix} Player ${index + 1}`,
      captain: index === 0,
      keeper: index === 1,
      substitute: false,
    })),
    ...Array.from({ length: substitutes }, (_, index) => ({
      name: `${prefix} Substitute ${index + 1}`,
      substitute: true,
    })),
  ];
}

function lineupPage(homeName, awayName, homePlayers, awayPlayers) {
  const payload = {
    matchInfo: {
      team1: { name: homeName, playerDetails: homePlayers },
      team2: { name: awayName, playerDetails: awayPlayers },
    },
  };
  return `<script>self.__next_f.push([1,"${JSON.stringify(payload).replace(/"/g, '\\"')}"])</script>`;
}

test("the same post-toss 11+11 rule applies to every CPL match number", async () => {
  for (let matchNumber = 1; matchNumber <= 39; matchNumber += 1) {
    const homeName = `Home Team ${matchNumber}`;
    const awayName = `Away Team ${matchNumber}`;
    let requestedNumber = null;
    const result = await loadConfirmedPlayingXi(
      {
        matchId: `match-${matchNumber}`,
        matchNumber,
        toss: `${homeName} won the toss`,
        teams: [{ name: homeName }, { name: awayName }],
      },
      {
        cache: new Map(),
        resolveMatchUrl: async (number) => {
          requestedNumber = number;
          return `https://verified.example/match/${number}`;
        },
        fetchPage: async () => lineupPage(
          homeName,
          awayName,
          players(`H${matchNumber}`, 11, 4),
          players(`A${matchNumber}`, 11, 5),
        ),
      },
    );
    assert.equal(requestedNumber, matchNumber);
    assert.deepEqual(result.map((lineup) => lineup.players.length), [11, 11]);
  }
});

test("the verified series index maps all 39 fixtures, including unnamed playoffs", () => {
  const fragments = [];
  for (let matchNumber = 1; matchNumber <= 39; matchNumber += 1) {
    const description = matchNumber <= 35
      ? `${matchNumber}th Match`
      : ["Eliminator", "Qualifier 1", "Qualifier 2", "Final"][matchNumber - 36];
    const payload = {
      matchInfo: {
        matchId: 150000 + matchNumber,
        seriesId: 12123,
        matchDesc: description,
        startDate: 1786000000000 + matchNumber * 86400000,
      },
    };
    fragments.push(JSON.stringify(payload).replace(/"/g, '\\"'));
  }
  fragments.push(JSON.stringify({
    matchInfo: {
      matchId: 999999,
      seriesId: 999,
      matchDesc: "1st Match",
      startDate: 1,
    },
  }).replace(/"/g, '\\"'));

  const index = parseVerifiedMatchIndex(fragments.join("\n"), 12123);
  assert.equal(index.size, 39);
  assert.equal(index.get(1), "https://www.cricbuzz.com/live-cricket-scores/150001");
  assert.equal(index.get(36), "https://www.cricbuzz.com/live-cricket-scores/150036");
  assert.equal(index.get(39), "https://www.cricbuzz.com/live-cricket-scores/150039");
});

test("before the toss, projected XIs remain and no verified source is fetched", async () => {
  let fetched = false;
  const result = await loadConfirmedPlayingXi(
    { matchNumber: 7, toss: "", teams: [{ name: "A" }, { name: "B" }] },
    {
      cache: new Map(),
      resolveMatchUrl: async () => {
        fetched = true;
        return "https://verified.example/match/7";
      },
      fetchPage: async () => "",
    },
  );
  assert.equal(result, null);
  assert.equal(fetched, false);
});

test("partial scorecard participation is never promoted to confirmed XI", async () => {
  const result = await loadConfirmedPlayingXi(
    {
      matchId: "partial-match",
      matchNumber: 12,
      toss: "Team A won the toss",
      teams: [{ name: "Team A" }, { name: "Team B" }],
      scorecard: [
        { confirmedPlayers: players("Scorecard A") },
        { confirmedPlayers: players("Scorecard B") },
      ],
    },
    {
      cache: new Map(),
      resolveMatchUrl: async () => "https://verified.example/match/12",
      fetchPage: async () => lineupPage(
        "Team A",
        "Team B",
        players("Verified A", 10),
        players("Verified B", 11),
      ),
    },
  );
  assert.equal(result, null);
});

test("only exact, unique 11-player lineups for both expected teams are accepted", () => {
  const expected = [{ name: "St. Kitts and Nevis Patriots" }, { name: "Barbados Tridents" }];
  const valid = parseConfirmedPlayingXi(
    lineupPage(
      "St Kitts and Nevis Patriots",
      "Barbados Tridents",
      players("Patriots", 11, 7),
      players("Tridents", 11, 6),
    ),
    expected,
  );
  assert.deepEqual(valid.map((lineup) => lineup.players.length), [11, 11]);

  const oversized = parseConfirmedPlayingXi(
    lineupPage("St Kitts and Nevis Patriots", "Barbados Tridents", players("P", 12), players("T", 11)),
    expected,
  );
  assert.equal(oversized, null);
});

test("a fetched confirmed XI is stored and reused if the source is temporarily unavailable", async () => {
  const cache = new Map();
  let fetches = 0;
  const match = {
    matchId: "cached-match",
    matchNumber: 31,
    toss: "Team A won the toss",
    teams: [{ name: "Team A" }, { name: "Team B" }],
  };
  const dependencies = {
    cache,
    resolveMatchUrl: async () => "https://verified.example/match/31",
    fetchPage: async () => {
      fetches += 1;
      return lineupPage("Team A", "Team B", players("A"), players("B"));
    },
  };
  const first = await loadConfirmedPlayingXi(match, dependencies);
  dependencies.fetchPage = async () => {
    throw new Error("source unavailable");
  };
  const second = await loadConfirmedPlayingXi(match, dependencies);
  assert.deepEqual(second, first);
  assert.equal(fetches, 1);
});

test("public match clients never promote squad or scorecard players", () => {
  const root = path.resolve(__dirname, "..");
  const matchClient = fs.readFileSync(path.join(root, "static/js/site.js"), "utf8");
  const liveScoreClient = fs.readFileSync(path.join(root, "static/js/live-score.js"), "utf8");
  assert.match(matchClient, /match\?\.confirmedPlayingXi/);
  assert.doesNotMatch(matchClient, /confirmedPlayers/);
  assert.match(liveScoreClient, /match\.confirmedPlayingXi/);
  assert.doesNotMatch(liveScoreClient, /team\?\.players/);
});

test("live score rendering uses bowler figures and innings-aware over summaries", () => {
  const liveScoreClient = fs.readFileSync(
    path.resolve(__dirname, "../static/js/live-score.js"),
    "utf8",
  );
  assert.match(liveScoreClient, /const runsConceded = Number\.isFinite\(player\.runsConceded\)/);
  assert.match(liveScoreClient, /bowlingDetails\.push\(`Econ /);
  assert.match(liveScoreClient, /Number\(item\?\.inningsNumber\) === Number\(ball\.inningsNumber\)/);
  assert.match(liveScoreClient, /const overBalls = visibleBalls\.filter\(sameOver\)/);
  assert.match(liveScoreClient, /const allOverBalls = balls\.filter\(sameOver\)/);
});

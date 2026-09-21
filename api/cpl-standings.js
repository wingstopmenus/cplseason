const API_ROOT = "https://api.mcpro.cricket/v1";
const COMPETITION_ID = "sr:tournament:16628";
const CPL_CLIENT_KEY = "c7b9bd69-0eee-4676-beee-fbbee46fccee";
const TEAM_COUNT = 7;
const T20_BALLS = 120;
const ESPN_SERIES_ID = "8623";
const ESPN_SCOREPANEL =
  "https://site.web.api.espn.com/apis/site/v2/sports/cricket/scorepanel";
const VERIFIED_TABLE_URL = "https://www.cricbuzz.com/cricket-series/12123/caribbean-premier-league-2026/points-table";
const FIXTURES = require("../static/match-spotlight.json");
const FALLBACK_TEAMS = [
  { teamId: "a0bb030f-9bcb-48ed-b031-621a6138c454", name: "Antigua & Barbuda Falcons" },
  { teamId: "a9ca4a61-d60a-45ea-b5e0-8e3875222b34", name: "Barbados Tridents" },
  { teamId: "9f05bd7c-1239-49a8-bc79-b71bf245fcd7", name: "Guyana Amazon Warriors" },
  { teamId: "sr:competitor:1346078", name: "Jamaica Kingsmen" },
  { teamId: "537f5a82-e672-4ead-9499-bc7a03b4cd56", name: "St Kitts & Nevis Patriots" },
  { teamId: "37bc79a8-04d6-473e-89e7-2f71a187a929", name: "St Lucia Kings" },
  { teamId: "70949cf7-1fd0-429d-b45d-4ae8f05db1b2", name: "Trinbago Knight Riders" },
];

const completedPattern = /complete|completed|result|abandon|cancel|no result/i;
const noResultPattern = /abandon|cancel|no result/i;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function comparableName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]/g, "");
}

function oversToBalls(value) { 
  const text = String(value ?? "").trim();
  if (!text) return null;
  const [wholeText, ballText = "0"] = text.split(".");
  const whole = Number(wholeText);
  const balls = Number(ballText);
  if (!Number.isInteger(whole) || !Number.isInteger(balls) || balls < 0 || balls > 6) {
    return null;
  }
  return whole * 6 + balls;
}

function inningsScore(innings) {
  const score = innings?.progressiveScores || innings?.score || {};
  const wickets = number(score.wickets);
  let balls = oversToBalls(score.oversBowled ?? score.overs);
  if (wickets >= 10 && balls !== null && balls < T20_BALLS) balls = T20_BALLS;
  return {
    teamId: String(innings?.battingTeamId || ""),
    runs: number(score.runs),
    wickets,
    balls,
  };
}

async function fetchOfficial(path) {
  const upstream = await fetch(`${API_ROOT}${path}`, {
    headers: { "sr-client-key": CPL_CLIENT_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!upstream.ok) throw new Error(`Official CPL feed returned ${upstream.status}`);
  return upstream.json();
}

async function fetchJson(url) {
  const upstream = await fetch(url, {
    headers: { "User-Agent": "CPLSeason standings verifier" },
    signal: AbortSignal.timeout(8000),
  });
  if (!upstream.ok) throw new Error(`Secondary score feed returned ${upstream.status}`);
  return upstream.json();
}

function fixtureMatchNumber(event) {
  const text = String(
    event?.competitions?.[0]?.description || event?.description || "",
  );
  return number(text.match(/(\d+)(?:st|nd|rd|th)?\s+Match/i)?.[1], 0);
}

function espnInnings(competitor) {
  const lines = Array.isArray(competitor?.linescores) ? competitor.linescores : [];
  const battingLine = lines
    .filter((line) => number(line?.runs) > 0)
    .sort((a, b) => number(b?.runs) - number(a?.runs))[0];
  if (!battingLine) return null;
  return {
    battingTeamId: String(competitor?.team?.id || competitor?.id || ""),
    progressiveScores: {
      runs: number(battingLine.runs),
      wickets: number(battingLine.wickets),
      oversBowled: String(battingLine.overs ?? ""),
    },
  };
}

function normalizeEspnEvent(event) {
  const competition = event?.competitions?.[0] || {};
  const competitors = Array.isArray(competition?.competitors)
    ? competition.competitors.slice(0, 2)
    : [];
  const winner = competitors.find(
    (competitor) => String(competitor?.winner).toLowerCase() === "true",
  );
  return {
    matchNumber: fixtureMatchNumber(event),
    status: "Completed",
    description: String(event?.status?.summary || competition?.status?.summary || ""),
    winnerName: String(winner?.team?.displayName || winner?.team?.name || ""),
    teams: competitors.map((competitor) => ({
      teamId: String(competitor?.team?.id || competitor?.id || ""),
      name: String(competitor?.team?.displayName || competitor?.team?.name || ""),
    })),
    inningsScores: competitors.map(espnInnings).filter(Boolean),
  };
}

function matchesCanonicalFixture(match) {
  const fixture = FIXTURES.find(
    (candidate) => Number(candidate.matchNumber) === Number(match.matchNumber),
  );
  if (!fixture || match.matchNumber > 35) return false;
  const expected = [fixture.home, fixture.away].map(comparableName).sort();
  const actual = match.teams.map((team) => comparableName(team.name)).sort();
  return actual.length === 2 && actual[0] === expected[0] && actual[1] === expected[1];
}

async function fetchEspnCompletedMatches() {
  const today = Date.now() + 6 * 60 * 60 * 1000;
  const dates = [
    ...new Set(
      FIXTURES.filter(
        (fixture) =>
          Number(fixture.matchNumber) <= 35 && Date.parse(fixture.startIso) <= today,
      ).map((fixture) => fixture.startIso.slice(0, 10).replace(/-/g, "")),
    ),
  ];
  const days = await Promise.all(
    dates.map((date) => {
      const query = new URLSearchParams({
        ceID: "4379198",
        contentorigin: "espn",
        lang: "en",
        region: "us",
        tz: "America/New_York",
        dates: date,
      });
      return fetchJson(`${ESPN_SCOREPANEL}?${query}`);
    }),
  );
  const events = days.flatMap((day) =>
    (day?.scores || []).flatMap((score) =>
      (score?.leagues || []).some((league) => String(league?.id) === ESPN_SERIES_ID)
        ? score?.events || []
        : [],
    ),
  );
  const completed = events
    .filter((event) => String(event?.status?.type?.state || "") === "post")
    .map(normalizeEspnEvent)
    .filter(matchesCanonicalFixture);
  return [...new Map(completed.map((match) => [match.matchNumber, match])).values()];
}

function ladderTeams(payload) {
  const ladder = Array.isArray(payload?.ladders) ? payload.ladders[0] : null;
  return Array.isArray(ladder?.teams) ? ladder.teams : [];
}

function normalizedOfficialStandings(teams) {
  return teams.map((team, index) => ({
    teamId: String(team?.teamId || ""),
    name: String(team?.name || ""),
    rank: number(team?.rank, index + 1),
    matches: number(team?.matches),
    wins: number(team?.wins),
    losses: number(team?.losses),
    noResults: Math.max(
      0,
      number(team?.abandonments ?? team?.noResults ?? team?.noResult),
    ),
    netRunRate: String(team?.netRunRate ?? "0.000"),
    points: number(team?.points),
  }));
}

function winnerName(match) {
  const direct =
    match?.winner?.name ||
    match?.winningTeam?.name ||
    match?.result?.winner?.name ||
    match?.winnerName ||
    match?.result?.winnerName;
  if (direct) return String(direct);
  const description = String(match?.description || match?.stateOfPlay || "");
  const won = description.match(/^(.+?)\s+won\b/i);
  return won ? won[1].trim() : "";
}

function createComputedTable(officialTeams) {
  return officialTeams.map((team, index) => ({
    teamId: String(team?.teamId || ""),
    name: String(team?.name || ""),
    seed: index,
    matches: 0,
    wins: 0,
    losses: 0,
    noResults: 0,
    points: 0,
    runsFor: 0,
    ballsFaced: 0,
    runsAgainst: 0,
    ballsBowled: 0,
  }));
}

function findTeam(table, team) {
  const id = String(team?.teamId || "");
  const name = comparableName(team?.name);
  return table.find(
    (candidate) =>
      (id && candidate.teamId === id) || comparableName(candidate.name) === name,
  );
}

function applyCompletedMatch(table, match) {
  const teams = Array.isArray(match?.teams) ? match.teams.slice(0, 2) : [];
  const records = teams.map((team) => findTeam(table, team)).filter(Boolean);
  if (records.length !== 2 || new Set(records).size !== 2) return false;

  records.forEach((record) => {
    record.matches += 1;
  });

  const description = String(match?.description || match?.stateOfPlay || "");
  if (noResultPattern.test(String(match?.status || "")) || noResultPattern.test(description)) {
    records.forEach((record) => {
      record.noResults += 1;
      record.points += 1;
    });
    return true;
  }

  const winnerKey = comparableName(winnerName(match));
  const winner = records.find((record) => comparableName(record.name) === winnerKey);
  if (winner) {
    winner.wins += 1;
    winner.points += 2;
    records.find((record) => record !== winner).losses += 1;
  } else if (/\btie(?:d)?\b/i.test(description)) {
    records.forEach((record) => {
      record.noResults += 1;
      record.points += 1;
    });
  } else {
    records.forEach((record) => {
      record.noResults += 1;
      record.points += 1;
    });
  }

  const innings = (Array.isArray(match?.inningsScores) ? match.inningsScores : [])
    .map(inningsScore)
    .filter((score) => score.teamId && score.balls && score.balls > 0);
  const recordByMatchTeamId = new Map(
    teams.map((team) => [String(team?.teamId || ""), findTeam(table, team)]),
  );
  innings.forEach((score) => {
    const batting = recordByMatchTeamId.get(score.teamId);
    const bowling = records.find((record) => record !== batting);
    if (!batting || !bowling) return;
    batting.runsFor += score.runs;
    batting.ballsFaced += score.balls;
    bowling.runsAgainst += score.runs;
    bowling.ballsBowled += score.balls;
  });
  return true;
}

function finalizeComputedTable(table) {
  const completed = table.map((team) => {
    const forRate = team.ballsFaced ? (team.runsFor * 6) / team.ballsFaced : 0;
    const againstRate = team.ballsBowled
      ? (team.runsAgainst * 6) / team.ballsBowled
      : 0;
    return {
      teamId: team.teamId,
      name: team.name,
      seed: team.seed,
      matches: team.matches,
      wins: team.wins,
      losses: team.losses,
      noResults: team.noResults,
      netRunRate: (forRate - againstRate).toFixed(3),
      points: team.points,
    };
  });

  completed.sort(
    (a, b) =>
      b.points - a.points ||
      Number(b.netRunRate) - Number(a.netRunRate) ||
      b.wins - a.wins ||
      a.seed - b.seed,
  );
  return completed.map(({ seed, ...team }, index) => ({ ...team, rank: index + 1 }));
}

async function computedStandings(officialTeams, completedMatches) {
  const summaries = await Promise.all(
    completedMatches.map(async (match) => {
      const matchId = String(match?.matchId || "");
      if (!matchId) return match;
      try {
        return await fetchOfficial(`/match/${matchId}`);
      } catch {
        return match;
      }
    }),
  );
  const table = createComputedTable(officialTeams);
  const applied = summaries.reduce(
    (count, match) => count + (applyCompletedMatch(table, match) ? 1 : 0),
    0,
  );
  return { standings: finalizeComputedTable(table), applied };
}

async function verifiedStandings() {
  const response = await fetch(VERIFIED_TABLE_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Verified points table unavailable");
  const decoded = (await response.text()).replace(/\\"/g, '"');
  const rowPattern = /\{"teamFullName":"([^"]+)","teamName":"[^"]+","teamId":\d+,"matchesPlayed":(\d+),"matchesWon":(\d+),"matchesLost":(\d+),"matchesTied":\d+,"noRes":(\d+),"matchesDrawn":\d+,"nrr":"([^"]+)","points":(\d+)/g;
  const rows = [...decoded.matchAll(rowPattern)].slice(0, TEAM_COUNT).map((row, index) => {
    const local = FALLBACK_TEAMS.find((team) => comparableName(team.name) === comparableName(row[1]));
    return { teamId: local?.teamId || String(index), name: local?.name || row[1], matches: number(row[2]), wins: number(row[3]), losses: number(row[4]), noResults: number(row[5]), netRunRate: number(row[6]).toFixed(3), points: number(row[7]), rank: index + 1 };
  });
  if (rows.length !== TEAM_COUNT) throw new Error("Verified points table is incomplete");
  return { standings: rows, completedMatches: Math.floor(rows.reduce((sum, team) => sum + team.matches, 0) / 2) };
}

module.exports = async function cplStandings(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  // Cricbuzz's published league table takes precedence over a stale upstream ladder.
  const latestVerified = await verifiedStandings().catch(() => null);
  if (latestVerified && latestVerified.completedMatches >= 35) {
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=180");
    response.setHeader("X-CPL-Standings-Source", "verified-live-table");
    return response.status(200).json({
      source: "verified-live-table",
      fetchedAt: new Date().toISOString(),
      ...latestVerified,
    });
  }
  try {
    const [ladderPayload, matchPayload, verified] = await Promise.all([
      fetchOfficial(`/competition/${COMPETITION_ID}/ladders`),
      fetchOfficial(`/matches?competitionId=${encodeURIComponent(COMPETITION_ID)}`),
      verifiedStandings().catch(() => null),
    ]);
    const rawOfficialTeams = ladderTeams(ladderPayload);
    if (rawOfficialTeams.length !== TEAM_COUNT || !Array.isArray(matchPayload)) {
      throw new Error("Official CPL standings response is incomplete");
    }

    const official = normalizedOfficialStandings(rawOfficialTeams);
    const completedMatches = matchPayload.filter((match) =>
      completedPattern.test(String(match?.status || "")),
    );
    const officialCompleted = Math.floor(
      official.reduce((total, team) => total + team.matches, 0) / 2,
    );

    let source = "official-cpl-ladder";
    let standings = official;
    let completedCount = officialCompleted;
    const newestCompletedCount = Math.max(officialCompleted, completedMatches.length);
    if (verified && verified.completedMatches >= newestCompletedCount) {
      source = "verified-live-table";
      standings = verified.standings;
      completedCount = verified.completedMatches;
    } else if (completedMatches.length > officialCompleted) {
      const computed = await computedStandings(rawOfficialTeams, completedMatches);
      if (computed.applied > officialCompleted) {
        source = "official-cpl-results-fallback";
        standings = computed.standings;
        completedCount = computed.applied;
      }
    }

    response.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=120");
    response.setHeader("X-CPL-Standings-Source", source);
    return response.status(200).json({
      source,
      fetchedAt: new Date().toISOString(),
      completedMatches: completedCount,
      standings,
    });
  } catch {
    try {
      const espnMatches = await fetchEspnCompletedMatches();
      if (!espnMatches.length && Date.now() >= Date.parse(FIXTURES[0].startIso)) {
        throw new Error("ESPNcricinfo has no verified completed CPL matches");
      }
      const table = createComputedTable(FALLBACK_TEAMS);
      const applied = espnMatches.reduce(
        (count, match) => count + (applyCompletedMatch(table, match) ? 1 : 0),
        0,
      );
      const source = "espncricinfo-verified-fallback";
      response.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=120");
      response.setHeader("X-CPL-Standings-Source", source);
      return response.status(200).json({
        source,
        fetchedAt: new Date().toISOString(),
        completedMatches: applied,
        standings: finalizeComputedTable(table),
      });
    } catch {
      response.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=120");
      response.setHeader("X-CPL-Standings-Source", "unavailable");
      return response.status(503).json({
        error: "Verified CPL standings feeds are temporarily unavailable",
      });
    }
  }
};

module.exports._test = {
  comparableName,
  oversToBalls,
  applyCompletedMatch,
  finalizeComputedTable,
  fetchEspnCompletedMatches,
};

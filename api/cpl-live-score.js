const API_ROOT = "https://api.mcpro.cricket/v1";
const COMPETITION_ID = "sr:tournament:16628";
const CPL_CLIENT_KEY = "c7b9bd69-0eee-4676-beee-fbbee46fccee";

const completedPattern = /complete|completed|result|abandon|cancel|no result/i;
const upcomingPattern = /upcoming|scheduled|fixture|pre-match/i;

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function logoUrl(logo) {
  return (
    logo?.small?.url ||
    logo?.formats?.thumbnail?.url ||
    logo?.original?.url ||
    logo?.url ||
    null
  );
}

function normalizeTeam(team) {
  return {
    id: String(team?.teamId || ""),
    name: String(team?.name || ""),
    shortName: String(team?.shortName || ""),
    isHome: Boolean(team?.isHome),
    logo: logoUrl(team?.logo),
    primaryColour: String(team?.primaryColour || ""),
    players: Array.isArray(team?.players)
      ? team.players.map((player) => ({
          name: displayPlayerName(
            player?.cardNameF ||
              player?.cardNameS ||
              [player?.firstName, player?.lastName].filter(Boolean).join(" ") ||
              "",
          ),
          captain: Boolean(player?.captain),
          wicketKeeper: Boolean(player?.wicketKeeper),
          substitute: Boolean(player?.substitute),
        }))
      : [],
  };
}

function normalizeInnings(innings) {
  const score = innings?.progressiveScores || innings?.score || innings || {};
  return {
    battingTeamId: String(innings?.battingTeamId || ""),
    inningsNumber: numeric(
      innings?.matchInningsNumber ?? innings?.teamInningsNumber,
    ),
    runs: numeric(score?.runs),
    wickets: numeric(score?.wickets),
    overs: numeric(score?.oversBowled ?? score?.overs),
    runRate: numeric(score?.runRate),
    extras: numeric(score?.extras),
    status: String(innings?.status || ""),
    closeReason: String(innings?.reasonForClose || ""),
    target: numeric(innings?.target),
  };
}

function normalizePlayerPerformance(performance) {
  const player =
    performance?.player || performance?.person || performance?.batter || {};
  return {
    name: displayPlayerName(
      player?.cardNameF ||
        player?.cardNameS ||
        performance?.cardNameF ||
        performance?.name ||
        "",
    ),
    runs: numeric(performance?.runs),
    balls: numeric(performance?.ballsFaced ?? performance?.balls),
    fours: numeric(performance?.fours),
    sixes: numeric(performance?.sixes),
    strikeRate: numeric(performance?.strikeRate),
    wickets: numeric(performance?.wickets),
    runsConceded: numeric(performance?.runsConceded),
    overs: numeric(performance?.overs),
    economy: numeric(performance?.economy),
  };
}

function normalizeRecentBall(ball) {
  return {
    label: String(
      ball?.shortDescription ||
        ball?.displayValue ||
        ball?.runs ||
        ball?.outcome ||
        "•",
    ),
    over: numeric(ball?.overNumber),
    ball: numeric(ball?.ballDisplayNumber ?? ball?.ballNumber),
    commentary: String(
      ball?.commentary ||
        ball?.description ||
        ball?.longDescription ||
        ball?.text ||
        ball?.shortDescription ||
        "",
    ),
  };
}

function normalizeToss(toss) {
  if (!toss) return "";
  if (typeof toss === "string") return toss;
  const winner = String(
    toss?.winner?.name ||
      toss?.team?.name ||
      toss?.wonBy?.name ||
      toss?.wonByName ||
      toss?.winnerName ||
      "",
  );
  const decision = String(
    toss?.decision || toss?.choice || toss?.electedTo || "",
  );
  if (!winner) return "";
  return `${winner} won the toss${
    decision ? ` and chose to ${decision.toLowerCase()}` : ""
  }`;
}

function displayPlayerName(value) {
  const name = String(value || "").trim();
  if (!name.includes(",")) return name;
  const [lastName, ...firstNames] = name.split(",").map((part) => part.trim());
  return [...firstNames, lastName].filter(Boolean).join(" ");
}

function normalizeTopPerformer(performance, kind) {
  if (!performance) return null;
  const player = performance?.player || performance?.person || {};
  const team = performance?.team || {};
  return {
    name: displayPlayerName(
      player?.cardNameF ||
        player?.cardNameS ||
        performance?.cardNameF ||
        performance?.name ||
        "",
    ),
    teamName: String(team?.name || performance?.teamName || ""),
    teamShortName: String(team?.shortName || performance?.teamShortName || ""),
    value: numeric(
      kind === "runs"
        ? performance?.runsTotal ?? performance?.runs
        : performance?.wicketsTotal ?? performance?.wickets,
    ),
  };
}

function normalizeMatch(match) {
  const competition = match?.competition || {};
  const liveSummary = match?.liveSummary || {};
  const winner =
    match?.winner || match?.winningTeam || match?.result?.winner || {};
  return {
    matchId: String(match?.matchId || ""),
    matchNumber: numeric(competition?.matchNumber ?? match?.matchNumber),
    title: String(match?.title || ""),
    status: String(match?.status || ""),
    startDate: String(match?.startDate || ""),
    endDate: String(match?.endDate || ""),
    format: String(match?.format || "T20"),
    stage: String(competition?.stageName || competition?.name || "CPL 2026"),
    description: String(match?.description || match?.stateOfPlay || ""),
    stateOfPlay: String(match?.stateOfPlay || ""),
    winnerName: String(
      winner?.name ||
        match?.winnerName ||
        match?.result?.winnerName ||
        "",
    ),
    toss: normalizeToss(match?.toss),
    venue: {
      name: String(match?.venue?.fullName || match?.venue?.name || ""),
    },
    teams: Array.isArray(match?.teams)
      ? match.teams.map(normalizeTeam).slice(0, 2)
      : [],
    innings: Array.isArray(match?.inningsScores)
      ? match.inningsScores.map(normalizeInnings)
      : [],
    topPerformers: {
      mostRuns: normalizeTopPerformer(match?.topPerformers?.mostRuns, "runs"),
      mostWickets: normalizeTopPerformer(
        match?.topPerformers?.mostWickets,
        "wickets",
      ),
    },
    live: {
      batters: Array.isArray(liveSummary?.currentBatters)
        ? liveSummary.currentBatters.map(normalizePlayerPerformance).slice(0, 2)
        : [],
      bowler: liveSummary?.currentBowler
        ? normalizePlayerPerformance(liveSummary.currentBowler)
        : null,
      recentBalls: Array.isArray(liveSummary?.recentBalls)
        ? liveSummary.recentBalls.map(normalizeRecentBall).slice(-12)
        : [],
      currentRunRate: numeric(
        liveSummary?.currentRunRate ?? liveSummary?.runRate,
      ),
      requiredRunRate: numeric(liveSummary?.requiredRunRate),
      target: numeric(liveSummary?.target),
    },
  };
}

function matchNumber(match) {
  return numeric(match?.competition?.matchNumber ?? match?.matchNumber) || 999;
}

function comparableTeamName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/saint/g, "st")
    .replace(/[^a-z0-9]/g, "");
}

function hasMatchup(match, homeName, awayName) {
  const requested = [homeName, awayName].map(comparableTeamName).sort();
  const actual = (match?.teams || []).map((team) => comparableTeamName(team?.name)).sort();
  return requested.every(Boolean) && actual.length === 2 && actual[0] === requested[0] && actual[1] === requested[1];
}

function seasonHeadToHead(matches, homeName, awayName) {
  const completed = matches
    .filter((match) => hasMatchup(match, homeName, awayName) && isCompleted(match))
    .map(normalizeMatch);
  const homeKey = comparableTeamName(homeName);
  const awayKey = comparableTeamName(awayName);
  return {
    matches: completed.length,
    homeWins: completed.filter((match) => comparableTeamName(match.winnerName) === homeKey).length,
    awayWins: completed.filter((match) => comparableTeamName(match.winnerName) === awayKey).length,
    through: completed.length ? "latest completed 2026 meeting" : "start of CPL 2026",
  };
}

function isCompleted(match) {
  return completedPattern.test(String(match?.status || ""));
}

function isUpcoming(match) {
  return upcomingPattern.test(String(match?.status || ""));
}

function isLive(match) {
  const status = String(match?.status || "");
  return Boolean(status) && !isCompleted(match) && !isUpcoming(match);
}

async function fetchOfficial(path) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { "sr-client-key": CPL_CLIENT_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Official CPL feed returned ${response.status}`);
  }
  return response.json();
}

async function fetchSummary(match) {
  const matchId = String(match?.matchId || "");
  if (!matchId) return normalizeMatch(match);
  try {
    const summary = normalizeMatch(await fetchOfficial(`/match/${matchId}`));
    if (!Number.isFinite(summary.matchNumber)) {
      summary.matchNumber = matchNumber(match);
    }
    return summary;
  } catch {
    return normalizeMatch(match);
  }
}

module.exports = async function cplLiveScore(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const officialMatches = await fetchOfficial(
      `/matches?competitionId=${encodeURIComponent(COMPETITION_ID)}`,
    );
    if (!Array.isArray(officialMatches) || officialMatches.length !== 39) {
      throw new Error("Official CPL feed returned an incomplete match list");
    }

    officialMatches.sort((a, b) => matchNumber(a) - matchNumber(b));
    const now = Date.now();
    const requestedNumber = numeric(request.query?.match);
    const requestedHome = String(request.query?.home || "");
    const requestedAway = String(request.query?.away || "");
    const requestedSource =
      officialMatches.find((match) => hasMatchup(match, requestedHome, requestedAway)) ||
      (Number.isFinite(requestedNumber)
        ? officialMatches.find((match) => matchNumber(match) === requestedNumber)
        : null);
    if (Number.isFinite(requestedNumber) && !requestedSource) {
      return response.status(404).json({ error: "CPL match not found" });
    }
    const liveMatch = officialMatches.find(isLive);
    const nextMatch = officialMatches.find(
      (match) =>
        !isCompleted(match) &&
        (!match.startDate || Date.parse(match.startDate) >= now),
    );
    const completedMatches = officialMatches.filter(isCompleted);
    const focusSource =
      liveMatch ||
      nextMatch ||
      completedMatches[completedMatches.length - 1] ||
      officialMatches[0];

    const recentSources = completedMatches.slice(-3).reverse();
    const [focus, recent, requestedMatch] = await Promise.all([
      isUpcoming(focusSource)
        ? Promise.resolve(normalizeMatch(focusSource))
        : fetchSummary(focusSource),
      Promise.all(recentSources.map(fetchSummary)),
      requestedSource
        ? (isUpcoming(requestedSource)
            ? Promise.resolve(normalizeMatch(requestedSource))
            : fetchSummary(requestedSource))
        : Promise.resolve(null),
    ]);

    const schedule = officialMatches.map(normalizeMatch);
    if (requestedMatch) {
      requestedMatch.seasonHeadToHead = seasonHeadToHead(
        officialMatches,
        requestedHome || requestedMatch.teams?.[0]?.name,
        requestedAway || requestedMatch.teams?.[1]?.name,
      );
    }
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=8, stale-while-revalidate=30",
    );
    response.setHeader("X-CPL-Live-Score-Source", "official-cpl-mcpro");
    return response.status(200).json({
      source: "official-cpl-mcpro",
      fetchedAt: new Date().toISOString(),
      focus,
      match: requestedMatch,
      schedule,
      recent,
    });
  } catch (error) {
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30",
    );
    response.setHeader("X-CPL-Live-Score-Source", "unavailable");
    return response.status(503).json({
      error: "Verified live score feed is temporarily unavailable",
    });
  }
};

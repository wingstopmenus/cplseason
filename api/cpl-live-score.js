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
          name: String(
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
    status: String(innings?.status || ""),
    closeReason: String(innings?.reasonForClose || ""),
    target: numeric(innings?.target),
  };
}

function normalizePlayerPerformance(performance) {
  const player =
    performance?.player || performance?.person || performance?.batter || {};
  return {
    name: String(
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
  };
}

function normalizeMatch(match) {
  const competition = match?.competition || {};
  const liveSummary = match?.liveSummary || {};
  return {
    matchId: String(match?.matchId || ""),
    matchNumber: numeric(competition?.matchNumber ?? match?.matchNumber),
    title: String(match?.title || ""),
    status: String(match?.status || ""),
    startDate: String(match?.startDate || ""),
    format: String(match?.format || "T20"),
    stage: String(competition?.stageName || competition?.name || "CPL 2026"),
    description: String(match?.description || match?.stateOfPlay || ""),
    stateOfPlay: String(match?.stateOfPlay || ""),
    venue: {
      name: String(match?.venue?.fullName || match?.venue?.name || ""),
    },
    teams: Array.isArray(match?.teams)
      ? match.teams.map(normalizeTeam).slice(0, 2)
      : [],
    innings: Array.isArray(match?.inningsScores)
      ? match.inningsScores.map(normalizeInnings)
      : [],
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
    const [focus, recent] = await Promise.all([
      fetchSummary(focusSource),
      Promise.all(recentSources.map(fetchSummary)),
    ]);

    const schedule = officialMatches.map(normalizeMatch);
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=12, stale-while-revalidate=45",
    );
    response.setHeader("X-CPL-Live-Score-Source", "official-cpl-mcpro");
    return response.status(200).json({
      source: "official-cpl-mcpro",
      fetchedAt: new Date().toISOString(),
      focus,
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

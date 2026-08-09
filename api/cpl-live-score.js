const API_ROOT = "https://api.mcpro.cricket/v1";
const COMPETITION_ID = "sr:tournament:16628";
const CPL_CLIENT_KEY = "c7b9bd69-0eee-4676-beee-fbbee46fccee";
const CPL_RESULTS_INDEX = "https://www.cricbuzz.com/cricket-series/12123/caribbean-premier-league-2026/matches";
let resultIndexCache = { expires: 0, matches: new Map() };
const verifiedMatchAwards = {
  "1": {
    name: "Alzarri Joseph",
    image: "/static/img/official/players/alzarri-joseph.webp",
    detail: "3 wickets",
  },
};
const verifiedPlayingXis = {
  "2": [
    {
      teamName: "St. Kitts and Nevis Patriots",
      players: ["Johnson Charles", "Andre Fletcher", "Kyle Mayers", "Alick Athanaze", "Jason Holder", "Kevin Wickham", "Navin Bidaisee", "Ashmead Nedd", "Obed McCoy", "Saurabh Netravalkar", "Waqar Salamkheil"],
    },
    {
      teamName: "Trinbago Knight Riders",
      players: ["Alex Hales", "Colin Munro", "Matthew Tromp", "Joshua Da Silva", "Matthew Breetzke", "Terrance Hinds", "Akeal Hosein", "Sunil Narine", "Dominic Drakes", "Jyd Goolie", "Dexter Sween"],
    },
  ],
};

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
    inningsId: String(performance?.inningsId || ""),
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

function normalizePlayerOfMatch(match) {
  const awardCollections = [
    match?.awards,
    match?.matchAwards,
    match?.playerAwards,
  ].flatMap((collection) =>
    Array.isArray(collection) ? collection : collection && typeof collection === "object" ? Object.values(collection) : [],
  );
  const namedAward = awardCollections.find((entry) =>
    /player\s+of\s+the\s+match|player\s+of\s+match|man\s+of\s+the\s+match/i.test(
      String(entry?.type || entry?.title || entry?.awardName || entry?.label || ""),
    ),
  );
  const award =
    match?.playerOfTheMatch ||
    match?.playerOfMatch ||
    match?.playerOfMatchAward ||
    match?.bestPlayer ||
    match?.awards?.playerOfTheMatch ||
    match?.awards?.playerOfMatch ||
    match?.matchAwards?.playerOfTheMatch ||
    namedAward ||
    null;
  if (!award) return null;
  if (typeof award === "string") return { name: displayPlayerName(award), image: null, detail: "" };
  const player = award?.player || award?.person || award?.recipient || award?.winner || award;
  const name = displayPlayerName(
    player?.cardNameF ||
      player?.cardNameS ||
      player?.fullName ||
      player?.name ||
      award?.name ||
      "",
  );
  if (!name) return null;
  return {
    name,
    image: logoUrl(player?.image || player?.photo || player?.headshot),
    detail: String(award?.description || award?.performance || ""),
  };
}

function normalizeCommentaryBall(ball, inningsNumber) {
  const upstreamOver = numeric(ball?.overNumber ?? ball?.over);
  return {
    inningsNumber: numeric(ball?.matchInningsNumber ?? ball?.inningsNumber ?? inningsNumber),
    label: String(ball?.shortDescription || ball?.displayValue || ball?.outcome || ball?.runs || "•"),
    over: Number.isFinite(upstreamOver) && ball?.overNumber !== undefined
      ? Math.max(0, upstreamOver - 1)
      : upstreamOver,
    ball: numeric(ball?.ballDisplayNumber ?? ball?.ballNumber ?? ball?.ball),
    commentary: String(ball?.description || ball?.commentary || ball?.longDescription || ball?.text || ""),
    batterName: displayPlayerName(ball?.batter?.cardNameF || ball?.batter?.cardNameS || ball?.batter?.name || ""),
    bowlerName: displayPlayerName(ball?.bowler?.cardNameF || ball?.bowler?.cardNameS || ball?.bowler?.name || ""),
    score: {
      runs: numeric(ball?.inningsProgressiveScore?.runs),
      wickets: numeric(ball?.inningsProgressiveScore?.wickets),
    },
  };
}

function extractCommentaryBalls(payload, fallbackInningsNumber) {
  const root = payload?.data ?? payload;
  const candidates = Array.isArray(root)
    ? root
    : root?.inningsBalls || root?.balls || root?.ballByBall || root?.commentary || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.flatMap((entry) => {
    if (Array.isArray(entry?.balls)) {
      const inningsNumber = entry?.matchInningsNumber ?? entry?.inningsNumber ?? fallbackInningsNumber;
      return entry.balls.map((ball) => normalizeCommentaryBall(ball, inningsNumber));
    }
    return [normalizeCommentaryBall(entry, fallbackInningsNumber)];
  });
}

function normalizeScorecard(rawScorecard) {
  const teams = new Map(
    (rawScorecard?.teams || []).map((team) => [String(team?.teamId || ""), team]),
  );
  const normalized = (rawScorecard?.inningsScorecards || []).map((innings) => {
    const score = innings?.progressiveScores || {};
    const battingTeam = teams.get(String(innings?.battingTeamId || "")) || {};
    return {
      inningsId: String(innings?.inningsId || ""),
      inningsNumber: numeric(innings?.matchInningsNumber),
      battingTeamId: String(innings?.battingTeamId || ""),
      bowlingTeamId: String(innings?.bowlingTeamId || ""),
      battingTeamName: String(battingTeam?.name || ""),
      runs: numeric(score?.runs),
      wickets: numeric(score?.wickets),
      overs: numeric(score?.oversBowled),
      runRate: numeric(score?.runRate),
      extras: {
        total: numeric(score?.extras),
        byes: numeric(score?.byes),
        legByes: numeric(score?.legByes),
        noBalls: numeric(score?.noBalls),
        wides: numeric(score?.wides),
      },
      batting: (innings?.battingPerformances || []).map((player) => ({
        name: displayPlayerName(player?.cardNameF || player?.cardNameS),
        dismissal: String(
          player?.notOut
            ? "not out"
            : player?.dismissal?.type || player?.text || "",
        ),
        runs: numeric(player?.runs),
        balls: numeric(player?.balls),
        fours: numeric(player?.fours),
        sixes: numeric(player?.sixes),
        strikeRate: numeric(player?.strikeRate),
        notOut: Boolean(player?.notOut),
      })),
      bowling: (innings?.bowlingPerformances || []).map((player) => ({
        name: displayPlayerName(player?.cardNameF || player?.cardNameS),
        overs: numeric(player?.overs),
        maidens: numeric(player?.maidens),
        runs: numeric(player?.runs),
        wickets: numeric(player?.wickets),
        economy: numeric(player?.economy),
        wides: numeric(player?.wides),
        noBalls: numeric(player?.noBalls),
      })),
      fallOfWickets: (innings?.fallOfWickets || []).map((entry) => ({
        name: displayPlayerName(
          entry?.batter?.cardNameF || entry?.batter?.cardNameS,
        ),
        wicket: numeric(entry?.dismissal?.wicketNumber),
        runs: numeric(entry?.dismissal?.fowRuns),
        over: String(entry?.dismissal?.fowOver || ""),
      })),
    };
  });
  return normalized.map((innings) => {
    const names = new Map();
    innings.batting.forEach((player) => names.set(player.name, player));
    normalized
      .filter((item) => item.bowlingTeamId === innings.battingTeamId)
      .flatMap((item) => item.bowling)
      .forEach((player) => names.set(player.name, player));
    return {
      ...innings,
      confirmedPlayers: [...names.values()].map((player) => ({ name: player.name })),
    };
  });
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

function applyDerivedMatchPhase(match) {
  const genericLive = /^(live|in progress|match in progress)$/i;
  const scheduledStart = Date.parse(String(match?.startDate || ""));
  if (Number.isFinite(scheduledStart) && scheduledStart > Date.now() + 5 * 60 * 1000 && completedPattern.test(String(match?.status || ""))) {
    match.status = "Scheduled";
    match.description = "Scheduled";
    match.stateOfPlay = "Scheduled";
    match.winnerName = "";
  }
  const status = String(match?.status || "");
  const state = String(match?.stateOfPlay || "");
  const description = String(match?.description || "");
  const innings = Array.isArray(match?.innings) ? match.innings : [];
  if (innings.length >= 2) {
    const first = innings[0];
    const chase = innings[innings.length - 1];
    const target = Number(first?.runs) + 1;
    const chaseRuns = Number(chase?.runs) || 0;
    const runsNeeded = Number.isFinite(target) ? Math.max(0, target - chaseRuns) : null;
    const battingTeam = (match.teams || []).find((team) => team.id === chase?.battingTeamId);
    if (Number.isFinite(target)) match.live.target = target;
    if (Number.isFinite(runsNeeded) && runsNeeded > 0) {
      match.chaseEquation = `${battingTeam?.name || "Batting team"} need ${runsNeeded} runs`;
    }
    const overParts = String(chase?.overs ?? "0").split(".").map(Number);
    const ballsUsed = (overParts[0] || 0) * 6 + (overParts[1] || 0);
    const ballsRemaining = Math.max(0, 120 - ballsUsed);
    if (runsNeeded > 0 && ballsRemaining > 0) match.live.requiredRunRate = Number((runsNeeded * 6 / ballsRemaining).toFixed(2));
    if (Number.isFinite(Number(chase?.runRate))) match.live.currentRunRate = Number(chase.runRate);
  }
  const firstInningsClosed = innings.length === 1 && /complete|closed|finished/i.test(String(innings[0]?.status || ""));
  if (!completedPattern.test(status) && !upcomingPattern.test(status) && firstInningsClosed && !match?.winnerName) {
    match.status = "Innings break";
    match.stateOfPlay = "Innings break";
    match.description = "Innings break";
  } else if (!genericLive.test(state) && state) {
    match.status = state;
  } else if (!genericLive.test(description) && description) {
    match.status = description;
    match.stateOfPlay = description;
  }
  return match;
}

function cleanHtmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function loadResultIndex() {
  if (resultIndexCache.expires > Date.now() && resultIndexCache.matches.size) return resultIndexCache.matches;
  const response = await fetch(CPL_RESULTS_INDEX, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Result index returned ${response.status}`);
  const html = await response.text();
  const matches = new Map();
  const linkPattern = /href="(\/live-cricket-scores\/\d+\/[^"?]*?-(\d+)(?:st|nd|rd|th)-match-[^"]*)"/gi;
  for (const link of html.matchAll(linkPattern)) matches.set(Number(link[2]), `https://www.cricbuzz.com${link[1]}`);
  resultIndexCache = { expires: Date.now() + 5 * 60 * 1000, matches };
  return matches;
}

async function hydrateCompletedResult(match) {
  const genericResult = /^(complete|completed|match complete|match completed|result)$/i;
  if (!completedPattern.test(String(match?.status || "")) || !genericResult.test(String(match?.description || ""))) return match;
  try {
    const resultUrl = (await loadResultIndex()).get(Number(match.matchNumber));
    if (!resultUrl) return match;
    const response = await fetch(resultUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return match;
    const html = await response.text();
    const resultMatch = html.match(/<div class="text-cbTextLink">([^<]*(?:won by|won|tied|no result|abandoned)[^<]*)<\/div>/i);
    const result = cleanHtmlText(resultMatch?.[1]);
    if (!result || genericResult.test(result)) return match;
    match.description = result;
    match.stateOfPlay = result;
    const winner = result.match(/^(.+?)\s+won\b/i)?.[1]?.trim();
    if (winner) match.winnerName = winner;
  } catch {
    // Keep the official payload when the secondary result page is temporarily unavailable.
  }
  return match;
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
    status: String(
      upcomingPattern.test(String(match?.status || "")) && match?.stateOfPlay
        ? match.stateOfPlay
        : match?.status || match?.stateOfPlay || "",
    ),
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
    playerOfMatch: normalizePlayerOfMatch(match),
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

async function fetchSummary(match, includeCommentary = false) {
  const matchId = String(match?.matchId || "");
  if (!matchId) return normalizeMatch(match);
  try {
    const rawSummary = await fetchOfficial(`/match/${matchId}`);
    const summary = applyDerivedMatchPhase(normalizeMatch(rawSummary));
    if (!Number.isFinite(summary.matchNumber)) {
      summary.matchNumber = matchNumber(match);
    }
    if (!summary.playerOfMatch) {
      summary.playerOfMatch = verifiedMatchAwards[String(summary.matchNumber)] || null;
    }
    if (summary.toss && verifiedPlayingXis[String(summary.matchNumber)]) {
      summary.confirmedPlayingXi = verifiedPlayingXis[String(summary.matchNumber)].map((lineup) => ({
        teamName: lineup.teamName,
        players: lineup.players.map((name) => ({ name })),
      }));
    }
    if (includeCommentary) {
      const rawScorecard = await fetchOfficial(`/match/${matchId}/scorecard`).catch(() => null);
      const innings = [...(rawSummary?.inningsScores || []), ...(rawScorecard?.inningsScorecards || [])]
        .filter((item, index, items) => item?.inningsId && items.findIndex((candidate) => String(candidate?.inningsId) === String(item.inningsId)) === index);
      const ballResponses = await Promise.all(innings.map((item) =>
          fetchOfficial(
            `/match/${matchId}/balls?inningsId=${encodeURIComponent(item.inningsId)}`,
          ).catch(() => null),
        ));
      summary.commentary = ballResponses
        .flatMap((payload, index) => extractCommentaryBalls(payload, innings[index]?.matchInningsNumber))
        .filter((ball) => ball.commentary || ball.label !== "•")
        .reverse();
      summary.scorecard = normalizeScorecard(rawScorecard);
      const currentCard = summary.scorecard[summary.scorecard.length - 1];
      const latestBall = summary.commentary[0];
      if (currentCard) {
        const activeBatters = currentCard.batting.filter((player) => player.notOut).slice(-2);
        if (activeBatters.length) summary.live.batters = activeBatters;
        const currentBowler = currentCard.bowling.find((player) =>
          latestBall?.bowlerName && player.name === latestBall.bowlerName,
        );
        if (currentBowler) summary.live.bowler = currentBowler;
        const innings = summary.innings.find((entry) => entry.inningsNumber === currentCard.inningsNumber);
        if (innings) {
          innings.runs = latestBall?.score?.runs ?? currentCard.runs ?? innings.runs;
          innings.wickets = latestBall?.score?.wickets ?? currentCard.wickets ?? innings.wickets;
          innings.overs = Number.isFinite(latestBall?.over) && Number.isFinite(latestBall?.ball)
            ? Number(`${latestBall.over}.${latestBall.ball}`)
            : currentCard.overs ?? innings.overs;
          innings.runRate = currentCard.runRate ?? innings.runRate;
        }
      }
      if (!summary.live.recentBalls.length && summary.commentary.length) {
        summary.live.recentBalls = summary.commentary.slice(0, 12).map((ball) => ({
          label: ball.label,
          over: ball.over,
          ball: ball.ball,
          commentary: ball.commentary,
        })).reverse();
      }
      const rawStatus = String(rawSummary?.status || "");
      const hasPartialInnings = summary.innings.some((innings) =>
        Number.isFinite(innings.overs) && innings.overs > 0 && innings.overs < 20,
      );
      const hasResultText = Boolean(summary.winnerName) || (summary.description && !/^completed$/i.test(summary.description));
      if (upcomingPattern.test(rawStatus) && hasPartialInnings && !hasResultText) {
        summary.status = "Play interrupted";
        summary.stateOfPlay = "Play interrupted";
        summary.description = "Play is currently interrupted";
      }
    }
    return hydrateCompletedResult(applyDerivedMatchPhase(summary));
  } catch {
    return applyDerivedMatchPhase(normalizeMatch(match));
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
    const activeWindowMatch = [...officialMatches].reverse().find((match) => {
      if (isCompleted(match) || !match?.startDate) return false;
      const start = Date.parse(match.startDate);
      return Number.isFinite(start) && start <= now && now - start < 12 * 60 * 60 * 1000;
    });
    const nextMatch = officialMatches.find(
      (match) =>
        !isCompleted(match) &&
        (!match.startDate || Date.parse(match.startDate) >= now),
    );
    const completedMatches = officialMatches.filter(isCompleted);
    const focusSource =
      liveMatch ||
      activeWindowMatch ||
      nextMatch ||
      completedMatches[completedMatches.length - 1] ||
      officialMatches[0];

    const recentSources = completedMatches.slice(-3).reverse();
    const [focus, recent, requestedMatch] = await Promise.all([
      fetchSummary(focusSource, true),
      Promise.all(recentSources.map(fetchSummary)),
      requestedSource
        ? fetchSummary(requestedSource, true)
        : Promise.resolve(null),
    ]);

    const liveDetails = new Map(
      [focus, requestedMatch]
        .filter(Boolean)
        .map((match) => [Number(match.matchNumber), match]),
    );
    const schedule = officialMatches.map((match) => {
      const normalized = applyDerivedMatchPhase(normalizeMatch(match));
      return liveDetails.get(Number(normalized.matchNumber)) || normalized;
    });
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
